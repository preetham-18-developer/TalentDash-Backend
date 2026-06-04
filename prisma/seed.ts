import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, UserRole, AuthProvider, InterviewDifficulty, InterviewResult, JobType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function randomFloat(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ─── Seed Data Constants ─────────────────────────────────────────────────────

const COMPANIES = [
  { name: 'Google', industry: 'Technology', hq: 'Bengaluru, India', employees: '10000+', founded: 1998 },
  { name: 'Microsoft', industry: 'Technology', hq: 'Hyderabad, India', employees: '10000+', founded: 1975 },
  { name: 'Amazon', industry: 'Technology', hq: 'Bengaluru, India', employees: '10000+', founded: 1994 },
  { name: 'Flipkart', industry: 'E-Commerce', hq: 'Bengaluru, India', employees: '5000-10000', founded: 2007 },
  { name: 'Swiggy', industry: 'Food Tech', hq: 'Bengaluru, India', employees: '5000-10000', founded: 2014 },
  { name: 'Zomato', industry: 'Food Tech', hq: 'Gurugram, India', employees: '5000-10000', founded: 2008 },
  { name: 'PhonePe', industry: 'Fintech', hq: 'Bengaluru, India', employees: '1000-5000', founded: 2015 },
  { name: 'Razorpay', industry: 'Fintech', hq: 'Bengaluru, India', employees: '1000-5000', founded: 2014 },
  { name: 'Paytm', industry: 'Fintech', hq: 'Noida, India', employees: '5000-10000', founded: 2010 },
  { name: 'Infosys', industry: 'IT Services', hq: 'Bengaluru, India', employees: '10000+', founded: 1981 },
  { name: 'TCS', industry: 'IT Services', hq: 'Mumbai, India', employees: '10000+', founded: 1968 },
  { name: 'Wipro', industry: 'IT Services', hq: 'Bengaluru, India', employees: '10000+', founded: 1945 },
  { name: 'Freshworks', industry: 'SaaS', hq: 'Chennai, India', employees: '1000-5000', founded: 2010 },
  { name: 'Zoho', industry: 'SaaS', hq: 'Chennai, India', employees: '10000+', founded: 1996 },
  { name: 'CRED', industry: 'Fintech', hq: 'Bengaluru, India', employees: '500-1000', founded: 2018 },
];

const ROLES = [
  'Software Engineer',
  'Senior Software Engineer',
  'Staff Engineer',
  'Principal Engineer',
  'Engineering Manager',
  'Product Manager',
  'Senior Product Manager',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps Engineer',
  'SRE',
  'UX Designer',
  'Data Analyst',
  'QA Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'Full Stack Engineer',
];

const CITIES = ['Bengaluru', 'Hyderabad', 'Mumbai', 'Delhi', 'Pune', 'Chennai', 'Noida', 'Gurugram'];

const LEVEL_DATA: Record<string, Array<{ number: number; title: string; subtitle: string }>> = {
  Google: [
    { number: 3, title: 'L3', subtitle: 'Software Engineer' },
    { number: 4, title: 'L4', subtitle: 'Software Engineer II' },
    { number: 5, title: 'L5', subtitle: 'Senior Software Engineer' },
    { number: 6, title: 'L6', subtitle: 'Staff Software Engineer' },
    { number: 7, title: 'L7', subtitle: 'Senior Staff Software Engineer' },
    { number: 8, title: 'L8', subtitle: 'Principal Engineer' },
  ],
  Microsoft: [
    { number: 59, title: 'SDE', subtitle: 'Software Engineer' },
    { number: 61, title: 'SDE II', subtitle: 'Software Engineer 2' },
    { number: 63, title: 'Senior SDE', subtitle: 'Senior Software Engineer' },
    { number: 65, title: 'Principal SDE', subtitle: 'Principal Software Engineer' },
    { number: 67, title: 'Partner', subtitle: 'Distinguished Engineer' },
  ],
  Amazon: [
    { number: 4, title: 'SDE I', subtitle: 'Software Development Engineer I' },
    { number: 5, title: 'SDE II', subtitle: 'Software Development Engineer II' },
    { number: 6, title: 'SDE III', subtitle: 'Senior SDE' },
    { number: 7, title: 'Principal SDE', subtitle: 'Principal Software Development Engineer' },
  ],
};

const PROS = [
  'Amazing work-life balance and flexible hours',
  'Excellent compensation and stock options',
  'Brilliant colleagues and collaborative culture',
  'Tremendous learning opportunities and growth',
  'Great engineering culture with high standards',
  'Cutting-edge technology stack',
  'Generous parental leave and health benefits',
  'Strong focus on employee wellbeing',
  'Remote work flexibility',
  'Impactful work at massive scale',
];

const CONS = [
  'Long working hours during product launches',
  'Politics can slow down decision making',
  'On-call rotation can be stressful',
  'Limited career growth in certain teams',
  'High performance bar can be intimidating',
  'Frequent re-orgs create uncertainty',
  'Compensation adjustments are slow',
  'Lack of work-life balance in some teams',
  'Bureaucracy in large org',
];

const INTERVIEW_PROCESSES = [
  'Applied online → HR screening → 2 technical rounds → system design → final bar raiser',
  'Referral → recruiter call → OA → 4 virtual onsite rounds → offer in 1 week',
  'LinkedIn outreach → 30-min intro call → 3 technical rounds → manager chat → offer',
  'Applied via careers page → phone screen → HackerRank test → 5 virtual interviews',
];

const INTERVIEW_QUESTIONS = [
  { question: 'Design a URL shortener like bit.ly', tags: ['System Design', 'Scalability'] },
  { question: 'Implement LRU Cache', tags: ['Data Structures', 'Algorithms'] },
  { question: 'Find the median of two sorted arrays', tags: ['Algorithms', 'Binary Search'] },
  { question: 'Design a distributed rate limiter', tags: ['System Design', 'Distributed Systems'] },
  { question: 'Serialize and deserialize a binary tree', tags: ['Trees', 'Recursion'] },
  { question: 'Design Twitter News Feed', tags: ['System Design', 'Feed Algorithm'] },
  { question: 'Trapping Rain Water', tags: ['Arrays', 'Two Pointers'] },
  { question: 'Design a messaging system like WhatsApp', tags: ['System Design', 'Messaging'] },
  { question: 'Word Break Problem', tags: ['Dynamic Programming', 'Recursion'] },
  { question: 'Tell me about a time you led a cross-functional project', tags: ['Behavioral', 'Leadership'] },
];

const POST_CATEGORIES = ['Career Advice', 'Compensation', 'Interview Tips', 'Work Culture', 'Tech Discussion'];

const POSTS = [
  {
    title: 'How I negotiated a 40% salary hike at Google',
    body: 'After 3 years at a mid-sized startup, I got a Google offer. Here is how I negotiated it from ₹42L to ₹58L CTC by using competing offers strategically. The key insight: recruiters have more flexibility than they admit. Always ask for more time and get competing offers before discussing numbers.',
    tags: ['negotiation', 'google', 'salary'],
    category: 'Compensation',
  },
  {
    title: 'System Design interviews are not about perfect answers',
    body: 'After 50+ mock interviews and 6 successful FAANG onsite passes, here is what I learned: interviewers care more about your thought process than the "correct" design. Start with requirements, discuss tradeoffs explicitly, and be comfortable saying "I am not sure, but I would approach it by..."',
    tags: ['system-design', 'interviews', 'faang'],
    category: 'Interview Tips',
  },
  {
    title: 'WFH culture at Indian startups — honest review after 4 years',
    body: 'I have worked at Swiggy, Razorpay, and CRED in the last 4 years, all remote or hybrid. Here is my honest assessment of work culture, management quality, and WLB at each. Spoiler: CRED wins on culture but Razorpay wins on engineering maturity.',
    tags: ['wfh', 'startups', 'culture', 'review'],
    category: 'Work Culture',
  },
  {
    title: 'From 5 LPA to 35 LPA in 3 years — my learning roadmap',
    body: 'I joined a small IT company in 2021 at 5 LPA with zero DSA knowledge. By 2024 I was at Amazon at 35 LPA. Here is the exact roadmap: NeetCode 150 → system design from DDIA → mock interviews on Pramp → 6 months dedicated prep. No magic, just consistent effort.',
    tags: ['career-growth', 'dsa', 'amazon', 'roadmap'],
    category: 'Career Advice',
  },
];

// ─── Main Seed Function ───────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting database seed...\n');

  // 1. Clean existing data
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.savedItem.deleteMany();
  await prisma.session.deleteMany();
  await prisma.interviewQuestion.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.review.deleteMany();
  await prisma.salary.deleteMany();
  await prisma.benefit.deleteMany();
  await prisma.job.deleteMany();
  await prisma.level.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Cleared existing data');

  // 2. Create admin user
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@talentdash.com',
      password_hash: adminHash,
      name: 'TalentDash Admin',
      role: UserRole.ADMIN,
      is_verified: true,
      is_active: true,
      provider: AuthProvider.EMAIL,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // 3. Create 20 regular users
  const userHash = await bcrypt.hash('User@123', 10);
  const users = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      prisma.user.create({
        data: {
          email: `user${i + 1}@example.com`,
          password_hash: userHash,
          name: `User ${i + 1}`,
          role: UserRole.USER,
          is_verified: true,
          is_active: true,
          provider: AuthProvider.EMAIL,
        },
      }),
    ),
  );
  console.log(`✅ Created ${users.length} regular users`);

  // 4. Create companies
  const createdCompanies = await Promise.all(
    COMPANIES.map((c) =>
      prisma.company.create({
        data: {
          name: c.name,
          slug: slug(c.name),
          industry: c.industry,
          headquarters: c.hq,
          employees_range: c.employees,
          founded_year: c.founded,
          is_verified: true,
          website: `https://www.${slug(c.name)}.com`,
        },
      }),
    ),
  );
  console.log(`✅ Created ${createdCompanies.length} companies`);

  // 5. Create levels for Google, Microsoft, Amazon
  for (const [companyName, levels] of Object.entries(LEVEL_DATA)) {
    const company = createdCompanies.find((c) => c.name === companyName);
    if (!company) continue;
    for (let i = 0; i < levels.length; i++) {
      const l = levels[i];
      await prisma.level.create({
        data: {
          company_id: company.id,
          level_number: l.number,
          title: l.title,
          subtitle: l.subtitle,
          order_index: i,
        },
      });
    }
  }
  console.log('✅ Created career levels for Google, Microsoft, Amazon');

  // 6. Create benefits
  const benefitCategories = ['Health', 'PTO', 'Remote Work', 'Learning', 'Food', 'Transport'];
  const benefitsByCategory: Record<string, string[]> = {
    Health: ['Comprehensive medical insurance', 'Dental & vision coverage', 'Mental health support', 'Gym membership'],
    PTO: ['30 days annual leave', 'Unlimited sick days', 'Generous parental leave'],
    'Remote Work': ['Work from anywhere', 'Home office stipend', 'Hybrid model'],
    Learning: ['₹1L annual learning budget', 'Conference allowance', 'Online course subscriptions'],
    Food: ['Free meals & snacks', 'Subsidised cafeteria', 'Meal allowance'],
    Transport: ['Free cab service', 'Transport allowance', 'EV charging stations'],
  };

  for (const company of createdCompanies.slice(0, 5)) {
    for (const category of benefitCategories) {
      const names = benefitsByCategory[category];
      await prisma.benefit.create({
        data: {
          company_id: company.id,
          category,
          name: randomFrom(names),
          rating: randomFloat(3.5, 5.0, 1),
        },
      });
    }
  }
  console.log('✅ Created company benefits');

  // 7. Create salaries (50 entries)
  const allUsers = [admin, ...users];
  for (let i = 0; i < 50; i++) {
    const company = randomFrom(createdCompanies);
    const role = randomFrom(ROLES);
    const city = randomFrom(CITIES);
    const yoe = randomInt(1, 15);
    const base = randomInt(8, 60) * 100000;
    const bonus = randomInt(5, 30) * 10000;
    const equity = randomInt(0, 20) * 100000;
    await prisma.salary.create({
      data: {
        company_id: company.id,
        user_id: randomFrom(allUsers).id,
        role,
        level: randomFrom(['Junior', 'Mid', 'Senior', 'Staff', 'Principal']),
        years_of_experience: yoe,
        base_salary: base,
        bonus,
        equity,
        total_compensation: base + bonus + equity,
        city,
        country: 'India',
        currency: 'INR',
        employment_type: 'Full-time',
        is_verified: Math.random() > 0.3,
        source: 'user_submission',
        submitted_at: daysAgo(randomInt(1, 365)),
      },
    });
  }
  console.log('✅ Created 50 salary records');

  // 8. Create reviews (40 entries)
  for (let i = 0; i < 40; i++) {
    const company = randomFrom(createdCompanies);
    const rating = randomFloat(2.5, 5.0, 1);
    await prisma.review.create({
      data: {
        company_id: company.id,
        user_id: randomFrom(users).id,
        role: randomFrom(ROLES),
        city: randomFrom(CITIES),
        employment_status: randomFrom(['Current', 'Former']),
        rating,
        work_life_rating: randomFloat(2.5, 5.0, 1),
        culture_rating: randomFloat(2.5, 5.0, 1),
        salary_rating: randomFloat(2.5, 5.0, 1),
        management_rating: randomFloat(2.5, 5.0, 1),
        career_rating: randomFloat(2.5, 5.0, 1),
        title: `My experience at ${company.name}`,
        pros: randomFrom(PROS),
        cons: randomFrom(CONS),
        recommend: rating >= 3.5,
        helpful_count: randomInt(0, 50),
        is_verified: true,
        source: 'user_submission',
        submitted_at: daysAgo(randomInt(1, 180)),
      },
    });
  }
  console.log('✅ Created 40 reviews');

  // 9. Create interviews (20 entries)
  for (let i = 0; i < 20; i++) {
    const company = randomFrom(createdCompanies);
    const interview = await prisma.interview.create({
      data: {
        company_id: company.id,
        user_id: randomFrom(users).id,
        role: randomFrom(ROLES),
        difficulty: randomFrom([InterviewDifficulty.EASY, InterviewDifficulty.MEDIUM, InterviewDifficulty.HARD]),
        result: randomFrom([InterviewResult.OFFER, InterviewResult.REJECTED, InterviewResult.NO_OFFER]),
        process: randomFrom(INTERVIEW_PROCESSES),
        tips: 'Practice system design, brush up on DSA, and prepare behavioral stories using STAR method.',
        rounds: randomInt(3, 6),
        duration_days: randomInt(7, 30),
        source: 'user_submission',
        submitted_at: daysAgo(randomInt(1, 90)),
      },
    });
    // Add 2–3 questions per interview
    const numQuestions = randomInt(2, 3);
    for (let q = 0; q < numQuestions; q++) {
      const qData = randomFrom(INTERVIEW_QUESTIONS);
      await prisma.interviewQuestion.create({
        data: {
          interview_id: interview.id,
          question: qData.question,
          tags: qData.tags,
        },
      });
    }
  }
  console.log('✅ Created 20 interviews with questions');

  // 10. Create offers (15 entries)
  for (let i = 0; i < 15; i++) {
    const company = randomFrom(createdCompanies);
    const base = randomInt(10, 80) * 100000;
    const bonus = randomInt(5, 20) * 100000;
    const equity = randomInt(0, 50) * 100000;
    const total = base + bonus + equity;
    await prisma.offer.create({
      data: {
        company_id: company.id,
        user_id: randomFrom(users).id,
        role: randomFrom(ROLES),
        level: randomFrom(['L3', 'L4', 'L5', 'SDE I', 'SDE II', 'Senior']),
        base_salary: base,
        bonus,
        equity,
        benefits_value: randomInt(2, 5) * 100000,
        total_comp: total,
        city: randomFrom(CITIES),
        country: 'India',
        currency: 'INR',
        offer_score: randomInt(60, 95),
        negotiated: Math.random() > 0.5,
        final_comp: total + randomInt(0, 10) * 100000,
        source: 'user_submission',
        submitted_at: daysAgo(randomInt(1, 90)),
      },
    });
  }
  console.log('✅ Created 15 offers');

  // 11. Create jobs (10 entries)
  for (let i = 0; i < 10; i++) {
    const company = randomFrom(createdCompanies);
    const salaryMin = randomInt(10, 30) * 100000;
    await prisma.job.create({
      data: {
        company_id: company.id,
        title: randomFrom(ROLES),
        description: `We are looking for a talented ${randomFrom(ROLES)} to join our team at ${company.name}. You will work on cutting-edge products serving millions of users across India.`,
        city: randomFrom(CITIES),
        country: 'India',
        is_remote: Math.random() > 0.7,
        job_type: randomFrom([JobType.FULL_TIME, JobType.CONTRACT]),
        experience_min: randomInt(1, 5),
        experience_max: randomInt(6, 12),
        salary_min: salaryMin,
        salary_max: salaryMin + randomInt(5, 20) * 100000,
        currency: 'INR',
        skills: randomFrom([
          ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
          ['Python', 'Machine Learning', 'PyTorch', 'Kubernetes'],
          ['React', 'Next.js', 'GraphQL', 'Tailwind CSS'],
          ['Java', 'Spring Boot', 'Kafka', 'Redis'],
          ['Go', 'gRPC', 'Docker', 'Kubernetes'],
        ]),
        apply_url: `https://${company.slug}.com/careers`,
        is_active: true,
        posted_at: daysAgo(randomInt(1, 30)),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log('✅ Created 10 job listings');

  // 12. Create community posts and comments
  for (const postData of POSTS) {
    const author = randomFrom(users);
    const post = await prisma.post.create({
      data: {
        user_id: author.id,
        category: postData.category,
        title: postData.title,
        body: postData.body,
        tags: postData.tags,
        upvotes: randomInt(10, 500),
        views: randomInt(100, 5000),
        is_hot: Math.random() > 0.5,
        is_pinned: false,
      },
    });

    // Add 3–5 comments per post
    const numComments = randomInt(3, 5);
    for (let c = 0; c < numComments; c++) {
      await prisma.comment.create({
        data: {
          post_id: post.id,
          user_id: randomFrom(users).id,
          body: randomFrom([
            'This is really helpful, thanks for sharing your experience!',
            'Completely agree with this. Had a similar experience at my company.',
            'Great insight. Any specific resources you would recommend?',
            'This is so accurate. The negotiation part is key.',
            'How long did the whole process take for you?',
            'Did you have competing offers, or did you negotiate based on market data alone?',
          ]),
          upvotes: randomInt(0, 30),
        },
      });
    }
  }
  console.log('✅ Created community posts and comments');

  // 13. Create saved items for some users
  const salaryCounts = await prisma.salary.findMany({ take: 5 });
  for (let i = 0; i < 10; i++) {
    const user = randomFrom(users);
    const salary = randomFrom(salaryCounts);
    try {
      await prisma.savedItem.create({
        data: {
          user_id: user.id,
          item_type: 'salary',
          item_id: salary.id,
        },
      });
    } catch {
      // ignore unique constraint violations
    }
  }
  console.log('✅ Created saved items');

  // Summary
  const counts = {
    users: await prisma.user.count(),
    companies: await prisma.company.count(),
    salaries: await prisma.salary.count(),
    reviews: await prisma.review.count(),
    interviews: await prisma.interview.count(),
    offers: await prisma.offer.count(),
    jobs: await prisma.job.count(),
    posts: await prisma.post.count(),
    comments: await prisma.comment.count(),
    levels: await prisma.level.count(),
  };

  console.log('\n🎉 Seed completed successfully!');
  console.log('─────────────────────────────────────────');
  console.table(counts);
  console.log('\n🔑 Admin credentials: admin@talentdash.com / Admin@123');
  console.log('👤 User credentials:  user1@example.com / User@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
