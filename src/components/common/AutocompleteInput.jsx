import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';

export const SUGGESTION_DICTIONARY = {
  technicalSkills: [
    'React', 'Node.js', 'JavaScript (ES6+)', 'TypeScript', 'Python', 'Java', 'C++', 'C#', '.NET Core',
    'Go (Golang)', 'Rust', 'PHP', 'Laravel', 'Ruby', 'Ruby on Rails', 'Swift', 'Kotlin', 'React Native', 'Flutter',
    'HTML5', 'CSS3', 'Sass / SCSS', 'TailwindCSS', 'Bootstrap', 'Material UI', 'Chakra UI', 'GraphQL', 'RESTful APIs',
    'gRPC', 'WebSocket', 'AWS (Amazon Web Services)', 'Azure', 'GCP (Google Cloud Platform)', 'Docker', 'Kubernetes',
    'Terraform', 'Ansible', 'Jenkins', 'GitHub Actions', 'CI/CD Pipelines', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'SQLite', 'Cassandra', 'Neo4j', 'Elasticsearch', 'DynamoDB', 'Oracle DB', 'Microservices Architecture',
    'Serverless Architecture', 'System Design', 'Data Structures & Algorithms', 'Machine Learning', 'Deep Learning',
    'Computer Vision', 'Natural Language Processing (NLP)', 'PyTorch', 'TensorFlow', 'Scikit-Learn', 'Pandas', 'NumPy',
    'OpenCV', 'Apache Spark', 'Hadoop', 'Kafka', 'RabbitMQ', 'WebGL', 'Three.js', 'WebAssembly', 'Jest', 'Cypress',
    'Playwright', 'Git', 'Linux / Unix Shell Scripting', 'Next.js', 'Express.js', 'NestJS', 'Flask', 'FastAPI', 'Spring Boot'
  ],

  softSkills: [
    'Leadership', 'Strategic Thinking', 'Problem Solving', 'Critical Thinking', 'Teamwork & Collaboration',
    'Cross-functional Communication', 'Public Speaking & Presentation', 'Conflict Resolution', 'Time Management',
    'Project Management', 'Agile / Scrum Methodology', 'Emotional Intelligence (EQ)', 'Negotiation Skills',
    'Customer-centric Mindset', 'Decision Making under Pressure', 'Mentorship & Coaching', 'Creative Problem Solving',
    'Adaptability & Resilience', 'Active Listening', 'Stakeholder Management', 'Detail-oriented Execution'
  ],

  tools: [
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'VS Code', 'IntelliJ IDEA', 'PyCharm', 'Postman', 'Insomnia',
    'Docker Desktop', 'Figma', 'Adobe XD', 'Canva', 'Jira', 'Confluence', 'Trello', 'Notion', 'Slack',
    'Microsoft Teams', 'Zoom', 'Webex', 'Google Workspace', 'AWS Management Console', 'Cloudflare', 'Vercel',
    'Netlify', 'Supabase', 'Firebase Console', 'Datadog', 'Grafana', 'Prometheus', 'Sentry', 'Mixpanel',
    'Google Analytics', 'Tableau', 'Power BI', 'Excel (Advanced)', 'Zapier', 'Make.com', 'PostgreSQL Admin (pgAdmin)'
  ],

  education: [
    'B.Tech in Computer Science & Engineering (CSE)', 'B.Tech in Information Technology (IT)',
    'B.Tech in Electronics & Communication (ECE)', 'B.Tech in Electrical Engineering (EE)',
    'B.E. in Computer Science', 'B.S. in Computer Science', 'B.S. in Software Engineering',
    'B.S. in Data Science & Analytics', 'B.C.A. (Bachelor of Computer Applications)',
    'M.Tech in Computer Science', 'M.Tech in Artificial Intelligence & Data Science',
    'M.S. in Computer Science', 'M.S. in Software Engineering', 'M.C.A. (Master of Computer Applications)',
    'B.B.A. (Bachelor of Business Administration)', 'M.B.A. in Technology Management',
    'M.B.A. in Product Management', 'Ph.D. in Computer Science / AI', 'Diploma in Computer Engineering'
  ],

  universities: [
    // Mixed Top Representation (State, Govt, Semi-Govt, Private, Deemed & IITs/NITs)
    'Maulana Abul Kalam Azad University of Technology (MAKAUT)',
    'Jadavpur University, Kolkata (State Govt)',
    'University of Calcutta, Kolkata (State Govt)',
    'University of Delhi (DU), New Delhi (Central Govt)',
    'Heritage Institute of Technology, Kolkata (Autonomous / MAKAUT)',
    'Techno Main Salt Lake / Techno India University, Kolkata (Private / MAKAUT)',
    'Institute of Engineering & Management (IEM), Kolkata',
    'BITS Pilani (Pilani, Goa, Hyderabad)',
    'Vellore Institute of Technology (VIT Vellore / Chennai / Bhopal / AP)',
    'SRM Institute of Science and Technology, Chennai',
    'Manipal Academy of Higher Education (MAHE), Manipal',
    'Delhi Technological University (DTU), New Delhi',
    'College of Engineering Pune (COEP Technological University)',
    'Veermata Jijabai Technological Institute (VJTI), Mumbai',
    'Savitribai Phule Pune University, Pune',
    'University of Mumbai, Mumbai',
    'Anna University, Chennai',
    'Visvesvaraya Technological University (VTU), Belagavi',
    'BMS College of Engineering (BMSCE), Bangalore',
    'R.V. College of Engineering (RVCE), Bangalore',
    'M.S. Ramaiah Institute of Technology (MSRIT), Bangalore',
    'Indian Institute of Technology (IIT) Bombay',
    'Indian Institute of Technology (IIT) Kharagpur',
    'Indian Institute of Technology (IIT) Delhi',
    'Indian Institute of Technology (IIT) Madras',
    'National Institute of Technology (NIT) Durgapur',
    'National Institute of Technology (NIT) Tiruchirappalli (Trichy)',
    'National Institute of Technology (NIT) Surathkal',
    'International Institute of Information Technology (IIIT) Hyderabad',

    // West Bengal & Eastern India (Govt, Semi-Govt, Private, Autonomous)
    'St. Xavier\'s College (Autonomous), Kolkata',
    'St. Xavier\'s University, Kolkata',
    'Presidency University, Kolkata',
    'Haldia Institute of Technology, West Bengal',
    'Netaji Subhash Engineering College (NSEC), Kolkata',
    'Kalyani Government Engineering College (KGEC), Nadia',
    'Jalpaiguri Government Engineering College (JGEC), Jalpaiguri',
    'Government College of Engineering & Leather Technology (GCELT), Kolkata',
    'Government College of Engineering & Textile Technology (GCETT), Serampore',
    'Government College of Engineering & Ceramic Technology (GCECT), Kolkata',
    'Purulia Government Engineering College, Purulia',
    'Cooch Behar Government Engineering College, Cooch Behar',
    'Ramkrishna Mahato Government Engineering College, Purulia',
    'Aliah University, Kolkata',
    'West Bengal State University (WBSU), Barasat',
    'University of Kalyani, West Bengal',
    'University of Burdwan, Purba Bardhaman',
    'Vidyasagar University, Midnapore',
    'North Bengal University (NBU), Siliguri',
    'Kazi Nazrul University, Asansol',
    'Scottish Church College, Kolkata',
    'Asutosh College, Kolkata',
    'Lady Brabourne College, Kolkata',
    'Bethune College, Kolkata',
    'Narula Institute of Technology (NIT Agarpara), Kolkata',
    'Guru Nanak Institute of Technology (GNIT), Kolkata',
    'JIS College of Engineering, Kalyani',
    'Future Institute of Engineering and Management (FIEM), Kolkata',
    'St. Thomas\' College of Engineering and Technology (STCET), Kolkata',
    'B.P. Poddar Institute of Management and Technology, Kolkata',
    'Bengal Institute of Technology, Dhapa, Kolkata',
    'MCKV Institute of Engineering, Howrah',
    'AOT - Academy of Technology, Adisaptagram, Hooghly',
    'Asansol Engineering College, Asansol',
    'Dr. BC Roy Engineering College, Durgapur',
    'Bankura Unnayani Institute of Engineering, Bankura',
    'Sister Nivedita University (SNU), Kolkata',
    'Amity University, Kolkata',
    'Adamas University, Barasat',
    'Brainware University, Barasat',
    'UEM - University of Engineering & Management, Kolkata',
    'Kalinga Institute of Industrial Technology (KIIT University), Bhubaneswar',
    'Siksha \'O\' Anusandhan (SOA University), Bhubaneswar',
    'CV Raman Global University, Bhubaneswar',
    'Outr (College of Engineering and Technology - CET), Bhubaneswar',
    'Silicon Institute of Technology, Bhubaneswar',
    'Utkal University, Bhubaneswar',
    'Tezpur University, Assam',
    'Gauhati University, Guwahati',
    'Assam Engineering College (AEC), Guwahati',
    'Jorhat Engineering College (JEC), Assam',
    'National Institute of Technology (NIT) Silchar',

    // North & Central India (Delhi NCR, UP, Punjab, Haryana, MP, Rajasthan)
    'Dr. A.P.J. Abdul Kalam Technical University (AKTU / UPTU), Lucknow',
    'Harcourt Butler Technical University (HBTU), Kanpur',
    'Madan Mohan Malaviya University of Technology (MMMUT), Gorakhpur',
    'Netaji Subhas University of Technology (NSUT), New Delhi',
    'Indira Gandhi Delhi Technical University for Women (IGDTUW), Delhi',
    'Jawaharlal Nehru University (JNU), New Delhi',
    'Banaras Hindu University (BHU), Varanasi',
    'Jamia Millia Islamia, New Delhi',
    'Aligarh Muslim University (AMU), Aligarh',
    'St. Stephen\'s College, New Delhi',
    'Hindu College, University of Delhi',
    'Miranda House, New Delhi',
    'Lady Shri Ram College for Women (LSR), New Delhi',
    'Shri Ram College of Commerce (SRCC), Delhi',
    'Hansraj College, New Delhi',
    'Amity University (Noida / Gurgaon / Lucknow / Jaipur)',
    'Galgotias University / Galgotias College of Engineering, Greater Noida',
    'Jaypee Institute of Information Technology (JIIT), Noida',
    'Bennett University, Greater Noida',
    'Sharda University, Greater Noida',
    'JSS Academy of Technical Education, Noida',
    'KIET Group of Institutions, Ghaziabad',
    'AKGEC - Ajay Kumar Garg Engineering College, Ghaziabad',
    'ABES Engineering College, Ghaziabad',
    'GL Bajaj Institute of Technology and Management, Greater Noida',
    'Shiv Nadar University (SNU), Greater Noida',
    'Ashoka University, Sonipat',
    'OP Jindal Global University, Sonipat',
    'Chandigarh University (CU), Mohali',
    'Lovely Professional University (LPU), Phagwara',
    'Thapar Institute of Engineering & Technology (TIET), Patiala',
    'Punjab Technical University (IKGPTU), Jalandhar',
    'PEC - Punjab Engineering College, Chandigarh',
    'Guru Nanak Dev University (GNDU), Amritsar',
    'Chitkara University, Punjab / Himachal Pradesh',
    'Graphic Era University, Dehradun',
    'UPES (University of Petroleum and Energy Studies), Dehradun',
    'DIT University, Dehradun',
    'Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV), Bhopal',
    'Maulana Azad National Institute of Technology (MANIT / NIT Bhopal)',
    'Shri Govindram Seksaria Institute of Technology and Science (SGSITS), Indore',
    'Madhav Institute of Technology and Science (MITS), Gwalior',
    'Rajasthan Technical University (RTU), Kota',
    'Malaviya National Institute of Technology (MNIT / NIT Jaipur)',
    'MBM Engineering College, Jodhpur',
    'LNM Institute of Information Technology (LNMIIT), Jaipur',

    // South India (Karnataka, Tamil Nadu, Telangana, Andhra Pradesh, Kerala)
    'PES University, Bangalore',
    'Dayananda Sagar College of Engineering (DSCE), Bangalore',
    'Nitte Meenakshi Institute of Technology (NMIT), Bangalore',
    'New Horizon College of Engineering (NHCE), Bangalore',
    'CMR Institute of Technology (CMRIT), Bangalore',
    'Bangalore Institute of Technology (BIT), Bangalore',
    'Reva University, Bangalore',
    'Christ University, Bangalore',
    'Jain University, Bangalore',
    'Alliance University, Bangalore',
    'St. Joseph\'s University, Bangalore',
    'Mount Carmel College, Bangalore',
    'PSG College of Technology, Coimbatore',
    'Coimbatore Institute of Technology (CIT), Coimbatore',
    'Thiagarajar College of Engineering (TCE), Madurai',
    'SSN College of Engineering, Chennai',
    'SASTRA Deemed University, Thanjavur',
    'KPR Institute of Engineering and Technology, Coimbatore',
    'Sathyabama Institute of Science and Technology, Chennai',
    'Hindustan Institute of Technology and Science, Chennai',
    'Rajalakshmi Engineering College (REC), Chennai',
    'Sri Sivasubramaniya Nadar College of Engineering, Chennai',
    'Loyola College, Chennai',
    'Madras Christian College (MCC), Chennai',
    'Stella Maris College, Chennai',
    'Presidency College, Chennai',
    'Jawaharlal Nehru Technological University (JNTUH / JNTUK / JNTUA), Hyderabad',
    'Osmania University, Hyderabad',
    'Vasavi College of Engineering, Hyderabad',
    'Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad',
    'Gokaraju Rangaraju Institute of Engineering and Technology (GRIET), Hyderabad',
    'Vardhaman College of Engineering, Hyderabad',
    'Anurag University, Hyderabad',
    'VNR Vignana Jyothi Institute of Engineering and Technology (VNRVJIET), Hyderabad',
    'Malla Reddy College of Engineering & Technology (MRCET), Hyderabad',
    'Andhra University, Visakhapatnam',
    'GITAM Deemed University, Visakhapatnam / Hyderabad / Bangalore',
    'Vignan\'s Foundation for Science, Technology & Research, Guntur',
    'KL Deemed to be University, Vaddeswaram, Guntur',
    'APJ Abdul Kalam Technological University (KTU), Kerala',
    'College of Engineering Trivandrum (CET), Thiruvananthapuram',
    'Government Engineering College (GEC), Thrissur',
    'Model Engineering College (MEC), Kochi',
    'TKM College of Engineering, Kollam',
    'Federal Institute of Science and Technology (FISAT), Angamaly',

    // West India (Maharashtra, Gujarat)
    'Sardar Patel Institute of Technology (SPIT), Mumbai',
    'Sardar Patel College of Engineering (SPCE), Mumbai',
    'K.J. Somaiya College of Engineering (KJSCE), Mumbai',
    'Dwarkadas J. Sanghvi College of Engineering (DJSCE), Mumbai',
    'Thadomal Shahani Engineering College (TSEC), Mumbai',
    'Walchand College of Engineering, Sangli',
    'Vishwakarma Institute of Technology (VIT Pune)',
    'MIT World Peace University (MIT-WPU), Pune',
    'Symbiosis International University (SIU / SIT), Pune',
    'NMIMS University (SVKM\'s NMIMS), Mumbai',
    'St. Xavier\'s College, Mumbai',
    'Mithibai College, Mumbai',
    'HR College of Commerce and Economics, Mumbai',
    'Fergusson College (Autonomous), Pune',
    'Gujarat Technological University (GTU), Ahmedabad',
    'Nirma University, Ahmedabad',
    'Pandit Deendayal Energy University (PDEU), Gandhinagar',
    'Dhirubhai Ambani Institute of Information and Communication Technology (DA-IICT), Gandhinagar',
    'L.D. College of Engineering (LDCE), Ahmedabad',
    'BVM Engineering College, Vallabh Vidyanagar',
    'Ahmedabad University, Ahmedabad',

    // IITs, NITs, IIITs, IISc, IISERs & Premier Institutions
    'Indian Institute of Science (IISc), Bangalore',
    'Indian Institute of Technology (IIT) Roorkee',
    'Indian Institute of Technology (IIT) Kanpur',
    'Indian Institute of Technology (IIT) Guwahati',
    'Indian Institute of Technology (IIT) BHU Varanasi',
    'Indian Institute of Technology (IIT) Hyderabad',
    'Indian Institute of Technology (IIT) Indore',
    'Indian Institute of Technology (IIT) Gandhinagar',
    'Indian Institute of Technology (IIT) Ropar',
    'Indian Institute of Technology (IIT) Patna',
    'Indian Institute of Technology (IIT) Bhubaneswar',
    'Indian Institute of Technology (IIT) Jodhpur',
    'Indian Institute of Technology (IIT) Tirupati',
    'Indian Institute of Technology (IIT) Palakkad',
    'Indian Institute of Technology (IIT) Bhilai',
    'Indian Institute of Technology (IIT) Goa',
    'Indian Institute of Technology (IIT) Jammu',
    'Indian Institute of Technology (IIT) Dharwad',
    'National Institute of Technology (NIT) Warangal',
    'National Institute of Technology (NIT) Calicut',
    'National Institute of Technology (NIT) Silchar',
    'National Institute of Technology (NIT) Kurukshetra',
    'National Institute of Technology (NIT) Allahabad (MNNIT)',
    'National Institute of Technology (NIT) Jaipur (MNIT)',
    'National Institute of Technology (NIT) Jalandhar',
    'National Institute of Technology (NIT) Nagpur (VNIT)',
    'National Institute of Technology (NIT) Surat (SVNIT)',
    'National Institute of Technology (NIT) Patna',
    'National Institute of Technology (NIT) Raipur',
    'National Institute of Technology (NIT) Agartala',
    'National Institute of Technology (NIT) Meghalaya',
    'National Institute of Technology (NIT) Goa',
    'National Institute of Technology (NIT) Puducherry',
    'National Institute of Technology (NIT) Uttarakhand',
    'National Institute of Technology (NIT) Srinagar',
    'Indian Institute of Information Technology (IIIT) Allahabad',
    'Indian Institute of Information Technology (IIIT) Lucknow',
    'Indian Institute of Information Technology (IIIT) Gwalior (ABV-IIITM)',
    'Indian Institute of Information Technology (IIIT) Jabalpur (PDPM-IIITDM)',
    'Indian Institute of Information Technology (IIIT) Kancheepuram',
    'Indian Institute of Information Technology (IIIT) Vadodara',
    'Indian Institute of Information Technology (IIIT) Surat',
    'Indian Institute of Information Technology (IIIT) Kota',
    'Indian Institute of Information Technology (IIIT) Sri City',
    'Indian Institute of Information Technology (IIIT) Pune',
    'Indian Institute of Information Technology (IIIT) Bhopal',
    'Indian Institute of Information Technology (IIIT) Nagpur',

    // Premier Global Universities
    'Harvard University, USA',
    'Massachusetts Institute of Technology (MIT), USA',
    'Stanford University, USA',
    'University of Oxford, UK',
    'University of Cambridge, UK',
    'Carnegie Mellon University (CMU), USA',
    'University of California, Berkeley (UC Berkeley), USA',
    'California Institute of Technology (Caltech), USA',
    'National University of Singapore (NUS), Singapore',
    'Nanyang Technological University (NTU), Singapore',
    'Imperial College London, UK',
    'ETH Zurich, Switzerland',
    'University of Toronto, Canada',
    'Columbia University, USA',
    'Cornell University, USA',
    'Georgia Institute of Technology (Georgia Tech), USA',
    'University of Washington, Seattle, USA',
    'University of Melbourne, Australia'
  ],

  schools: [
    // Central & Govt School Networks
    'Kendriya Vidyalaya (KV / KVS)',
    'Kendriya Vidyalaya No. 1 / No. 2 / No. 3',
    'Jawahar Navodaya Vidyalaya (JNV)',
    'Delhi Public School (DPS)',
    'DAV Public School / DAV Model School',
    'Army Public School (APS)',
    'Air Force School',
    'Navy Children School',
    'Sainik School (Chittorgarh / Korukonda / Kapurthala / Satara / Purulia / Kazhakootam)',
    'Rashtriya Military School (RMS Dholpur / Chail / Belgaum / Bengaluru / Ajmer)',
    'Government Higher Secondary School (GHSS / State Govt)',
    'Government Boys / Girls Senior Secondary School (GBSSS / GGSSS)',
    'Zilla Parishad High School (ZPHS)',
    'Municipal Corporation High School (MCHS)',
    'Atomic Energy Central School (AECS)',
    'Railway Higher Secondary School',
    'Eklavya Model Residential School (EMRS)',
    'Kasturba Gandhi Balika Vidyalaya (KGBV)',

    // Popular Convent, Missionary & Private School Networks
    'St. Xavier\'s High School / Collegiate School',
    'St. Xavier\'s School (CBSE / ICSE / State Board)',
    'Don Bosco School (Park Circus / Bandel / Liluah / Guwahati / Silchar / Egmore)',
    'St. Joseph\'s High School / Convent School',
    'St. Mary\'s Convent / High School',
    'St. Paul\'s School / Academy',
    'St. Francis High School / Convent School',
    'Sacred Heart Convent School',
    'Holy Cross School',
    'Carmel School / Convent School',
    'Loreto House / Convent School (Kolkata / Asansol / Lucknow / Delhi)',
    'Notre Dame Academy',
    'Sophia High School / Girls\' School',
    'Good Shepherd Convent / Public School',
    'St. Jude\'s High School / Convent',
    'St. Anthony\'s High School',
    'St. Patrick\'s Higher Secondary School',
    'St. John\'s High School / Public School',
    'St. Luke\'s School',
    'St. Peter\'s School / Academy',
    'St. Lawrence High School, Kolkata',
    'St. Joan\'s School',
    'St. Stephen\'s School',
    'St. Augustine\'s Day School',

    // Prominent Private & Semi-Govt Nationwide Chains
    'Ryan International School',
    'Podar International School',
    'Mount Litera Zee School',
    'Maharishi Vidya Mandir',
    'Chinmaya Vidyalaya',
    'Bharatiya Vidya Bhavan (BVB)',
    'Amity International School',
    'GD Goenka Public School',
    'Apeejay School',
    'Lotus Valley International School',
    'Orchids The International School',
    'Vibgyor High School',
    'EuroSchool International',
    'Narayana E-Techno School',
    'Sri Chaitanya Techno School',
    'Saraswati Shishu Mandir / Vidya Mandir',
    'Adarsh Vidya Mandir',
    'Ramakrishna Mission High School / Vidyapith',
    'Vivekananda Kendra Vidyalaya (VKV)',
    'JIS Public School',
    'Techno India Group Public School (TIGPS)',

    // West Bengal & Eastern India Schools
    'South Point High School, Kolkata (WBBSE / WBCHSE / CBSE)',
    'La Martiniere for Boys / Girls, Kolkata',
    'St. James\' School, Kolkata',
    'Calcutta Boys\' School / Calcutta Girls\' School',
    'St. Thomas\' Boys\' / Girls\' School, Kidderpore, Kolkata',
    'Assembly of God Church School (AGCS), Kolkata',
    'The Heritage School, Kolkata',
    'Salt Lake School, Kolkata',
    'Ballygunge Shiksha Sadan (BSS), Kolkata',
    'Modern High School for Girls, Kolkata',
    'Mahadevi Birla World Academy, Kolkata',
    'Future Foundation School, Kolkata',
    'National High School, Kolkata',
    'Ramakrishna Mission Vidyapith (Narendrapur / Rahara / Belur / Purulia / Deoghar)',
    'Hindu School, Kolkata (State Board)',
    'Hare School, Kolkata',
    'Bethune Collegiate School, Kolkata',
    'Scottish Church Collegiate School, Kolkata',
    'Apex Academy / St. Augustine\'s Day School, Kolkata',
    'DPS Ruby Park / Newtown / Megacity / Howrah, Kolkata',
    'Bhavan\'s Gangabux Kanoria Vidyamandir (BGKVM), Salt Lake',
    'B.D.M. International School, Kolkata',
    'Adamas International School, Kolkata',
    'Frank Anthony Public School, Kolkata',
    'Pratt Memorial School, Kolkata',
    'Julien Day School (Calcutta / Garia / Kalyani)',
    'Welland Gouldsmith School, Kolkata',
    'Techno India Group Public School, Hooghly / Siliguri / Durgapur',
    'G.D. Goenka Public School, Siliguri',
    'Delhi Public School, Siliguri / Durgapur / Asansol',
    'St. Joseph\'s School (North Point), Darjeeling',
    'Loreto Convent, Darjeeling',
    'St. Paul\'s School, Darjeeling',
    'Demonstration Multipurpose School (DMS), Bhubaneswar',
    'SAI International School, Bhubaneswar',
    'DPS Kalinga / Bhubaneswar / Rourkela',
    'Cotton Collegiate High School, Guwahati',
    'Don Bosco Senior Secondary School, Guwahati',

    // Delhi NCR & Northern India Schools
    'Modern School, Barakhamba Road / Vasant Vihar, New Delhi',
    'Mother\'s International School, New Delhi',
    'Sanskriti School, Chanakyapuri, New Delhi',
    'The Air Force School (TAFS), Subroto Park, New Delhi',
    'Springdales School, Dhaula Kuan / Pusa Road, New Delhi',
    'Bal Bharati Public School (BBPS), Delhi NCR',
    'Convent of Jesus and Mary (CJM), New Delhi',
    'St. Columba\'s School, New Delhi',
    'DPS R.K. Puram / Mathura Road / Vasant Kunj / Dwarka, New Delhi',
    'DPS Noida / Gurgaon / Faridabad / Indirapuram / Greater Noida',
    'Apeejay School, Noida / Pitampura / Saket / Panchsheel Park',
    'Salwan Public School, New Delhi',
    'The Heritage School, Gurgaon / Rohini',
    'Shiv Nadar School, Gurgaon / Noida',
    'The Doon School, Dehradun',
    'Welham Boys\' / Girls\' School, Dehradun',
    'Woodstock School, Mussoorie',
    'Sherwood College, Nainital',
    'Scindia School, Gwalior',
    'Mayo College / Mayo College Girls\' School, Ajmer',
    'Bishop Cotton School, Shimla',
    'Lawrence School, Sanawar / Lovedale',
    'Pinegrove School, Solan',

    // West India Schools (Maharashtra & Gujarat)
    'Cathedral and John Connon School, Mumbai',
    'St. Mary\'s School (ICSE / SSC), Mumbai',
    'Campion School, Fort, Mumbai',
    'Bombay Scottish School, Mahim / Powai, Mumbai',
    'Jamnabai Narsee School, Mumbai',
    'Smt. Sulochanadevi Singhania School, Thane',
    'Dhirubhai Ambani International School (DAIS), Mumbai',
    'Loyola High School & Junior College, Pune',
    'St. Vincent\'s High School, Pune',
    'Bishop\'s School, Camp / Undri, Pune',
    'DPS Ahmedabad / Vadodara / Surat / Rajkot',
    'Utpal Shanghvi Global School, Mumbai',
    'RN Podar School, Santacruz, Mumbai',
    'Don Bosco High School, Matunga, Mumbai',
    'Arya Vidya Mandir (AVM), Bandra / Juhu, Mumbai',

    // South India Schools (Karnataka, Tamil Nadu, Telangana, AP, Kerala)
    'National Public School (NPS Indiranagar / Rajajinagar / Koramangala / HSR), Bangalore',
    'Bishop Cotton Boys\' / Girls\' School, Bangalore',
    'St. Joseph\'s Boys\' High School, Bangalore',
    'Mallya Aditi International School, Bangalore',
    'Baldwin Boys\' / Girls\' High School, Bangalore',
    'Padma Seshadri Bala Bhavan (PSBB Millennium), Chennai',
    'DAV Boys / Girls Senior Secondary School, Gopalapuram, Chennai',
    'St. Bede\'s Anglo Indian Higher Secondary School, Chennai',
    'Madras Christian College Higher Secondary School (MCC HSS), Chennai',
    'Hyderabad Public School (HPS Begumpet / Ramanthapur)',
    'St. George\'s Grammar School, Hyderabad',
    'Little Flower High School, Hyderabad',
    'Rosary Convent High School, Hyderabad',
    'Loyola Public School, Guntur / Vijayawada',
    'Chinmaya Vidyalaya, Kochi / Trivandrum',
    'Bhavan\'s Vidya Mandir, Elamakkara / Eroor, Kochi',
    'Loyola School, Thiruvananthapuram'
  ],

  boards: [
    'CBSE (Central Board of Secondary Education)', 'ICSE / ISC (Council for the Indian School Certificate Examinations)',
    'State Board (West Bengal WBBSE / WBCHSE)', 'State Board (Maharashtra MSBSHSE)',
    'State Board (Karnataka KSEEB)', 'State Board (Tamil Nadu)', 'State Board (UP Board)',
    'IB (International Baccalaureate)', 'IGCSE / Cambridge International'
  ],

  classes: [
    'Class 12 (Senior Secondary / Higher Secondary)', 'Class 10 (Secondary School Certificate)',
    'Diploma in Engineering / Polytechnic', 'High School Diploma (Standard Academic)'
  ],

  streams: [
    'Science (Physics, Chemistry, Mathematics - PCM)', 'Science (Physics, Chemistry, Biology, Math - PCMB)',
    'Computer Science & Information Technology', 'Commerce with Mathematics', 'Commerce with Accountancy',
    'Humanities / Arts & Social Sciences'
  ],

  proficiencies: [
    'Native / Bilingual Proficiency', 'Full Professional Proficiency', 'Professional Working Proficiency',
    'Conversational Proficiency', 'Elementary / Basic Proficiency'
  ],

  hackathonTypes: [
    'Smart India Hackathon (SIH)', 'Google Solution Challenge', 'HackMIT', 'ETHIndia Blockchain Hackathon',
    'LeetCode Weekly & Biweekly Contests', 'Codeforces Competitive Programming', 'Hacktoberfest Open Source Contributor',
    'Kaggle Data Science Competition'
  ],

  languages: [
    'English', 'Hindi', 'Bengali', 'Spanish', 'French', 'German', 'Mandarin Chinese',
    'Japanese', 'Arabic', 'Portuguese', 'Russian', 'Italian', 'Korean', 'Dutch', 'Polish',
    'Turkish', 'Swedish', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu',
    'Kannada', 'Malayalam', 'Odia', 'Vietnamese', 'Indonesian', 'Thai', 'Tagalog'
  ],

  interests: [
    'Artificial Intelligence (AI) & Machine Learning', 'Robotics & Hardware Hacking', 'Open Source Software Contributing',
    'Competitive Programming & Algorithmic Problem Solving', 'Web Development & Modern UI/UX Design',
    'Cloud Architecture & DevOps Innovations', 'Cybersecurity & Ethical Hacking', 'Game Development & 3D Graphics',
    'Mobile App Engineering', 'Data Science & Big Data Analytics', 'Blockchain & Web3 Ecosystems',
    'Tech Blogging & Technical Content Creation', 'Hiking & Outdoor Mountain Trekking', 'Chess & Strategic Gaming',
    'Photography & Digital Videography', 'Reading Sci-Fi & Technology Books', 'Music Production & Acoustic Guitar',
    'Fitness, Gym & Marathon Running', 'E-sports & Competitive Gaming', 'Astronomy & Deep Space Exploration',
    'Volunteering, Teaching & Tech Mentorship'
  ],

  volunteeringRoles: [
    'Tech Lead & Developer Mentor', 'Community Technical Manager', 'Open Source Software Contributor',
    'Workshop Instructor & Educator', 'Event Technical Coordinator', 'Student Chapter President / Lead',
    'Hackathon Organizer & Judge', 'Non-profit Volunteer Developer'
  ],

  certifications: [
    'AWS Certified Solutions Architect - Associate', 'AWS Certified Solutions Architect - Professional',
    'AWS Certified Developer - Associate', 'AWS Certified DevOps Engineer - Professional',
    'Google Cloud Professional Cloud Architect', 'Google Cloud Associate Cloud Engineer',
    'Microsoft Certified: Azure Administrator Associate', 'Microsoft Certified: Azure Solutions Architect Expert',
    'Certified ScrumMaster (CSM)', 'Professional Scrum Master I (PSM I)', 'PMP (Project Management Professional)',
    'CompTIA Security+', 'Certified Information Systems Security Professional (CISSP)',
    'Oracle Certified Professional, Java SE Developer', 'Meta Front-End Developer Professional Certificate',
    'Meta Back-End Developer Professional Certificate', 'Google Data Analytics Professional Certificate',
    'Kubernetes Certified Administrator (CKA)', 'HashiCorp Certified: Terraform Associate'
  ],

  jobTitles: [
    'Senior Frontend Engineer', 'Lead Frontend Developer', 'Full Stack Engineer', 'Senior Full Stack Developer',
    'Backend Software Engineer', 'Lead Backend Engineer', 'DevOps Engineer', 'Cloud Infrastructure Engineer',
    'Site Reliability Engineer (SRE)', 'Data Engineer', 'Senior Data Scientist', 'Machine Learning Engineer',
    'AI Research Scientist', 'Product Manager', 'Technical Product Manager', 'UI / UX Designer',
    'Lead UX Researcher', 'QA Automation Engineer', 'Cybersecurity Engineer', 'Engineering Manager',
    'Director of Engineering', 'Chief Technology Officer (CTO)'
  ],

  companies: [
    'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Stripe', 'Airbnb', 'Uber', 'Spotify',
    'Adobe', 'Salesforce', 'Oracle', 'IBM', 'Cisco', 'Intel', 'Nvidia', 'AMD', 'Tesla', 'Twitter / X',
    'LinkedIn', 'Zoom', 'Slack', 'Figma', 'Vercel', 'Supabase', 'OpenAI', 'Anthropic', 'Databricks',
    'Snowflake', 'TCS (Tata Consultancy Services)', 'Infosys', 'Wipro', 'HCLTech', 'Cognizant',
    'Accenture', 'Capgemini', 'Tech Mahindra', 'Dell Technologies', 'Sony', 'Deloitte', 'PwC', 'EY', 'KPMG'
  ],

  locations: [
    'Kolkata, West Bengal, India', 'Bangalore / Bengaluru, Karnataka, India', 'Hyderabad, Telangana, India',
    'Pune, Maharashtra, India', 'Mumbai, Maharashtra, India', 'Delhi NCR (Gurgaon / Noida), India',
    'Chennai, Tamil Nadu, India', 'Ahmedabad, Gujarat, India', 'Remote (Work from Home - Worldwide)',
    'Remote (India Only)', 'San Francisco, CA, USA', 'New York, NY, USA', 'Seattle, WA, USA',
    'Austin, TX, USA', 'London, United Kingdom', 'Toronto, Ontario, Canada', 'Vancouver, BC, Canada',
    'Berlin, Germany', 'Munich, Germany', 'Singapore', 'Sydney, Australia', 'Dubai, UAE'
  ],

  dates: [
    'Jan 2022 - Present', 'June 2021 - Dec 2023', '2020 - 2024', '2019 - 2023', '2021 - 2025',
    'Present', 'Ongoing', 'Aug 2023 - Present', 'Jan 2024 - Present', '2020', '2022', '2024', '2025', '2026'
  ],

  scores: [
    'First Class with Distinction', '95% Marks', '90% Marks', '88% Marks', '3.9 / 4.0 GPA', '3.8 / 4.0 GPA',
    'Top 5% of Graduating Class', 'Summa Cum Laude', 'Magna Cum Laude', '9.5 / 10.0 CGPA',
    '9.0 / 10.0 CGPA', '8.5 / 10.0 CGPA', 'Grade A+ (Distinction)'
  ],

  projectNames: [
    'Enterprise Job Tracker SaaS', 'AI Candidate Matching Engine', 'E-Commerce Full Stack SaaS Platform',
    'Real-Time Collaborative Code Editor', 'Cloud Infrastructure & DevOps Automation Pipeline',
    'FinTech Payment Gateway & Microservice', 'Healthcare Patient Record Management System',
    'AI Spoken Speech & Audio Evaluator', 'Portfolio Website & Blog Engine', 'Social Media Analytics & Sentiment Dashboard'
  ],

  journals: [
    'IEEE Transactions on Software Engineering', 'ACM Computing Surveys', 'ArXiv Computer Science Preprint',
    'Springer Nature Computer Science Journal', 'Elsevier Pattern Recognition Letters',
    'International Conference on Learning Representations (ICLR)', 'NeurIPS Proceedings', 'CVPR Computer Vision'
  ]
};

export function formatTitleCase(str) {
  if (!str || typeof str !== 'string') return str;

  const uppercaseWords = new Set([
    'IIT', 'NIT', 'IIIT', 'IIM', 'IISc', 'IISER', 'BITS', 'VIT', 'SRM', 'MAHE', 'IEM',
    'DU', 'JNU', 'BHU', 'MAKAUT', 'VTU', 'KTU', 'AKTU', 'UPTU', 'RGPV', 'COEP', 'VJTI',
    'DTU', 'NSUT', 'IGDTUW', 'GCELT', 'GCETT', 'GCECT', 'KGEC', 'JGEC', 'NSEC', 'STCET',
    'FIEM', 'AOT', 'MCKV', 'BGKVM', 'TIGPS', 'SNU', 'UEM', 'LPU', 'CU', 'TIET', 'KIIT',
    'SOA', 'CET', 'AEC', 'JEC', 'MMMUT', 'HBTU', 'LNMIIT', 'SGSITS', 'MITS', 'MNIT',
    'MNNIT', 'DSCE', 'NMIT', 'NHCE', 'CMRIT', 'BIT', 'PSBB', 'MCC', 'HPS', 'CBIT',
    'GRIET', 'VNRVJIET', 'MRCET', 'GITAM', 'SPIT', 'SPCE', 'KJSCE', 'DJSCE', 'TSEC',
    'DA-IICT', 'LDCE', 'BVM', 'DAIS', 'AVM', 'SIT', 'SIU', 'SVNIT', 'VNIT', 'MANIT',
    'CBSE', 'ICSE', 'ISC', 'WBBSE', 'WBCHSE', 'MSBSHSE', 'KSEEB', 'UP', 'MP', 'AP',
    'KV', 'KVS', 'JNV', 'DPS', 'DAV', 'APS', 'RMS', 'GHSS', 'GBSSS', 'GGSSS', 'ZPHS',
    'MCHS', 'AECS', 'EMRS', 'KGBV', 'AGCS', 'BSS', 'BVB', 'TAFS', 'BBPS', 'CJM',
    'AIIMS', 'CMC', 'KGMU', 'KMC', 'ICT', 'XLRI', 'SPJIMR', 'MDI', 'SIBM', 'NMIMS',
    'USA', 'UK', 'AI', 'ML', 'CSE', 'ECE', 'EEE', 'IT', 'ME', 'CE', 'CGPA', 'GPA'
  ]);

  const lowercaseWords = new Set(['of', 'and', 'in', 'for', 'the', 'at', 'on', 'by', 'to', 'with', 'a', 'an', 'or', '&']);

  const chunks = str.split(/(\s+)/);
  let wordIndex = 0;
  const nonSpaceCount = chunks.filter(w => w.trim()).length;

  return chunks.map(chunk => {
    if (!chunk.trim()) return chunk;

    const currentIdx = wordIndex++;
    const cleanAlpha = chunk.replace(/^[^\w]+|[^\w]+$/g, '');
    if (!cleanAlpha) return chunk;

    const upperClean = cleanAlpha.toUpperCase();
    if (uppercaseWords.has(upperClean)) {
      return chunk.replace(cleanAlpha, upperClean);
    }

    if (/^[a-z]\.([a-z]\.)+/i.test(cleanAlpha)) {
      const formattedAbbr = cleanAlpha.split('.').map(part => {
        if (!part) return '';
        if (part.length === 1) return part.toUpperCase();
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }).join('.');
      return chunk.replace(cleanAlpha, formattedAbbr);
    }

    const lowerClean = cleanAlpha.toLowerCase();
    if (currentIdx > 0 && currentIdx < nonSpaceCount - 1 && lowercaseWords.has(lowerClean)) {
      return chunk.replace(cleanAlpha, lowerClean);
    }

    const capitalized = cleanAlpha.split(/(['’])/).map((part, pIdx) => {
      if (part === "'" || part === "’") return part;
      if (pIdx > 0 && part.toLowerCase() === 's') return 's';
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join('');

    return chunk.replace(cleanAlpha, capitalized);
  }).join('');
}

export function AutocompleteInput({ value, onChange, placeholder, suggestions = [], id, name, type = "text", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filtered = useMemo(() => {
    if (!value || !value.trim()) return suggestions.slice(0, 15);

    const trimmedValue = value.trim();
    const query = trimmedValue.toLowerCase();
    const queryTokens = query.split(/[\s,()/.-]+/).filter(Boolean);

    // 1. Find suggestions containing all query tokens
    let matches = suggestions.filter(s => {
      const lower = s.toLowerCase();
      return queryTokens.every(token => lower.includes(token));
    });

    // 2. If no multi-token match, find suggestions containing any relevant token (>2 chars)
    if (matches.length === 0 && queryTokens.length > 1) {
      matches = suggestions.filter(s => {
        const lower = s.toLowerCase();
        return queryTokens.some(token => token.length > 2 && lower.includes(token));
      });
    }

    // 3. Sort matches to prioritize startsWith
    matches.sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(query);
      const bStarts = b.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    // 4. Always prepend the user's typed value in Title Case if it's not an exact match already
    const formattedUserVal = formatTitleCase(trimmedValue);
    const lowerMatches = new Set(matches.map(m => m.toLowerCase()));
    const finalResults = [...matches];
    if (formattedUserVal && !lowerMatches.has(query)) {
      finalResults.unshift(formattedUserVal);
    }

    return finalResults.slice(0, 25);
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBlur = () => {
    if (value && typeof value === 'string' && value.trim()) {
      const formatted = formatTitleCase(value.trim());
      if (formatted !== value) {
        onChange(formatted);
      }
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        id={id}
        name={name}
        type={type}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onBlur={handleBlur}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <ul className="autocomplete-dropdown">
          {filtered.map((item, idx) => (
            <li
              key={idx}
              className="autocomplete-item"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(formatTitleCase(item));
                setIsOpen(false);
              }}
            >
              <Search size={14} style={{ opacity: 0.5, marginRight: 8, flexShrink: 0 }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AutocompleteTextarea({ value, onChange, placeholder, suggestions = [], rows = 3, id, name, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!value) {
      setCurrentWord('');
      return;
    }
    const parts = value.split(',');
    const lastPart = parts[parts.length - 1].trim();
    setCurrentWord(lastPart);
  }, [value]);

  const filtered = useMemo(() => {
    if (!currentWord || !currentWord.trim()) return suggestions.slice(0, 15);

    const trimmedWord = currentWord.trim();
    const query = trimmedWord.toLowerCase();
    const queryTokens = query.split(/[\s,()/.-]+/).filter(Boolean);

    let matches = suggestions.filter(s => {
      const lower = s.toLowerCase();
      return queryTokens.every(token => lower.includes(token));
    });

    if (matches.length === 0 && queryTokens.length > 1) {
      matches = suggestions.filter(s => {
        const lower = s.toLowerCase();
        return queryTokens.some(token => token.length > 2 && lower.includes(token));
      });
    }

    const formattedUserWord = formatTitleCase(trimmedWord);
    const lowerMatches = new Set(matches.map(m => m.toLowerCase()));
    const finalResults = [...matches];
    if (formattedUserWord && !lowerMatches.has(query)) {
      finalResults.unshift(formattedUserWord);
    }

    return finalResults.slice(0, 25);
  }, [currentWord, suggestions]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    const formattedItem = formatTitleCase(item);
    if (!value || !value.includes(',')) {
      onChange(formattedItem);
    } else {
      const parts = value.split(',');
      parts[parts.length - 1] = ' ' + formattedItem;
      onChange(parts.join(','));
    }
    setIsOpen(false);
  };

  const handleBlur = () => {
    if (value && typeof value === 'string' && value.trim()) {
      const formatted = formatTitleCase(value.trim());
      if (formatted !== value) {
        onChange(formatted);
      }
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onBlur={handleBlur}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
      />
      {isOpen && filtered.length > 0 && (
        <ul className="autocomplete-dropdown" style={{ top: '100%' }}>
          {filtered.map((item, idx) => (
            <li
              key={idx}
              className="autocomplete-item"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(item);
              }}
            >
              <Search size={14} style={{ opacity: 0.5, marginRight: 8, flexShrink: 0 }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
