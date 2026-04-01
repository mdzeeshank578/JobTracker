export function processManualEmailText(rawText, currentJobs) {
  const keywords = {
    interview: ['interview', 'schedule', 'invitation'],
    offer: ['offer', 'selected', 'congratulations'],
    rejected: ['regret', 'unfortunately', 'not selected', 'rejected', 'moving forward with another']
  };

  const textToAnalyze = rawText.toLowerCase();
  
  let classification = 'ignore';
  let matchedCompany = null;
  let matchedJobId = null;

  // Prioritize offer -> interview -> rejected
  if (keywords.offer.some(kw => textToAnalyze.includes(kw))) {
    classification = 'Offer';
  } else if (keywords.interview.some(kw => textToAnalyze.includes(kw))) {
    classification = 'Interviewing';
  } else if (keywords.rejected.some(kw => textToAnalyze.includes(kw))) {
    classification = 'Rejected';
  }

  if (classification !== 'ignore') {
    // Look for a matching company from the current tracker
    for (const job of currentJobs) {
      const companyWords = job.company.toLowerCase().split(' ').filter(w => w.length > 2);
      
      let matchFound = false;
      if (companyWords.length > 0) {
         // check if any of the significant company words appear in the text
         matchFound = companyWords.some(cw => textToAnalyze.includes(cw));
      } else {
         matchFound = textToAnalyze.includes(job.company.toLowerCase());
      }

      if (matchFound) {
          matchedCompany = job.company;
          matchedJobId = job.id;
          break; // take the first match
      }
    }

    if (matchedCompany && matchedJobId) {
        const existingJob = currentJobs.find(j => j.id === matchedJobId);
        // Don't downgrade status unintentionally
        const isDowngrade = existingJob.status === 'Offer' || existingJob.status === 'Rejected';
        if (isDowngrade && classification !== existingJob.status) {
           return {
              success: false,
              message: `Matched with ${matchedCompany}, but current status is already ${existingJob.status}. Update skipped.`
           };
        }

        if (existingJob.status === classification) {
           return {
              success: false,
              message: `Matched with ${matchedCompany}, but status is already ${classification}.`
           };
        }

        return {
           success: true,
           jobId: matchedJobId,
           company: matchedCompany,
           newStatus: classification,
           message: `Successfully classified as an ${classification} from ${matchedCompany}!`
        };
    } else {
        return {
            success: false,
            message: `Classified as an ${classification}, but could not find a matching company. Please include the company name from your tracker!`
        };
    }
  }

  return {
      success: false,
      message: 'Could not detect an Offer, Interview, or Rejection from this text.'
  };
}
