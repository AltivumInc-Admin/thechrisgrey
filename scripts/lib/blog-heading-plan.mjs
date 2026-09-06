/**
 * The applied blog-heading rewrite plan (VAL-AEO-003).
 *
 * Pure data: 42 heading rewrites and 8 heading insertions, each naming the
 * Sanity document, the portable-text block _key, and the exact before/after
 * text. Split out of scripts/rewrite-blog-headings.mjs so the executable there
 * is readable as an executable; this plan was applied to production in commit
 * bac21a7 and is kept as its auditable record.
 */

// -----------------------------------------------------------------------------
// Rewrite plan: existing non-question headings converted to question form.
// Each entry: { docId, slug, title, blockKey, before, after }
// -----------------------------------------------------------------------------
export const REWRITES = [
  // from-keating-to-coding (8 h3, 0 questions -> rewrite 7, keep "Afterward")
  {
    docId: '5f1a15f9-c4b8-44e8-bfec-c9e7224f508e',
    slug: 'from-keating-to-coding',
    title: 'From Keating to Coding',
    blockKey: 'a678cced2a12',
    before: 'The Prompt is the New Command Line',
    after: 'Is the Prompt the New Command Line?',
  },
  {
    docId: '5f1a15f9-c4b8-44e8-bfec-c9e7224f508e',
    slug: 'from-keating-to-coding',
    title: 'From Keating to Coding',
    blockKey: '307dac0c93d7',
    before: 'Prompt Engineering: The New Literacy',
    after: 'Why Is Prompt Engineering the New Literacy?',
  },
  {
    docId: '5f1a15f9-c4b8-44e8-bfec-c9e7224f508e',
    slug: 'from-keating-to-coding',
    title: 'From Keating to Coding',
    blockKey: 'a2ef0649d7a7',
    before: 'Keating, Concision, and Computational Semantics',
    after: 'What Does Keating Teach Us About Computational Semantics?',
  },
  {
    docId: '5f1a15f9-c4b8-44e8-bfec-c9e7224f508e',
    slug: 'from-keating-to-coding',
    title: 'From Keating to Coding',
    blockKey: '172686d48d0c',
    before: 'Prompt Structures: A Brief Taxonomy',
    after: 'What Are the Core Prompt Structures?',
  },
  {
    docId: '5f1a15f9-c4b8-44e8-bfec-c9e7224f508e',
    slug: 'from-keating-to-coding',
    title: 'From Keating to Coding',
    blockKey: 'b9c56af54c35',
    before: 'The Lexicon of the Future is Human',
    after: 'Why Is the Lexicon of the Future Human?',
  },
  {
    docId: '5f1a15f9-c4b8-44e8-bfec-c9e7224f508e',
    slug: 'from-keating-to-coding',
    title: 'From Keating to Coding',
    blockKey: '92747c65ceb2',
    before: 'Conversations with Machines',
    after: 'How Do Conversations with Machines Make Us Better?',
  },
  {
    docId: '5f1a15f9-c4b8-44e8-bfec-c9e7224f508e',
    slug: 'from-keating-to-coding',
    title: 'From Keating to Coding',
    blockKey: '534d882936ae',
    before: 'Final Thought: The Renaissance is Semantic',
    after: 'Is the Next Renaissance Semantic?',
  },

  // the-imperative (5 h3, 1 question -> rewrite 4, keep "What This Means for Veteran Employment")
  {
    docId: '36ca1284-ca3c-4440-8da0-d471782ceeab',
    slug: 'the-imperative',
    title: 'The Imperative',
    blockKey: 'cb4a8ff1efdf',
    before: 'Understand Your Operational Environment',
    after: 'Why Must Veterans Understand Their Operational Environment?',
  },
  {
    docId: '36ca1284-ca3c-4440-8da0-d471782ceeab',
    slug: 'the-imperative',
    title: 'The Imperative',
    blockKey: '0f7f16a0de8e',
    before: 'The New Hiring Reality',
    after: 'What Is the New Hiring Reality?',
  },
  {
    docId: '36ca1284-ca3c-4440-8da0-d471782ceeab',
    slug: 'the-imperative',
    title: 'The Imperative',
    blockKey: '96a0da51a857',
    before: 'The Path Forward',
    after: 'What Is the Path Forward for Veteran Employment?',
  },
  {
    docId: '36ca1284-ca3c-4440-8da0-d471782ceeab',
    slug: 'the-imperative',
    title: 'The Imperative',
    blockKey: 'a75ad6508131',
    before: 'The Bottom Line',
    after: 'What Is the Bottom Line on AI and Jobs?',
  },

  // what-enterprise-sites-know-that-templates-don-t (6 h2, 0 questions -> rewrite all 6)
  {
    docId: '9b7767f1-7a8e-40ae-a935-8b8bd59d8d60',
    slug: 'what-enterprise-sites-know-that-templates-don-t',
    title: "What Enterprise Sites Know That Templates Don't",
    blockKey: '7386eaa25542',
    before: 'Introduction',
    after: 'What Does This Guide Cover?',
  },
  {
    docId: '9b7767f1-7a8e-40ae-a935-8b8bd59d8d60',
    slug: 'what-enterprise-sites-know-that-templates-don-t',
    title: "What Enterprise Sites Know That Templates Don't",
    blockKey: '870a6d36b34e',
    before: 'Installation',
    after: 'How Do You Install the Kiro CLI?',
  },
  {
    docId: '9b7767f1-7a8e-40ae-a935-8b8bd59d8d60',
    slug: 'what-enterprise-sites-know-that-templates-don-t',
    title: "What Enterprise Sites Know That Templates Don't",
    blockKey: 'b8307d492d2c',
    before: 'Build',
    after: 'How Do You Build Your First Project?',
  },
  {
    docId: '9b7767f1-7a8e-40ae-a935-8b8bd59d8d60',
    slug: 'what-enterprise-sites-know-that-templates-don-t',
    title: "What Enterprise Sites Know That Templates Don't",
    blockKey: '1b64b6f98ad6',
    before: 'CI/CD',
    after: 'How Do You Set Up CI/CD with GitHub?',
  },
  {
    docId: '9b7767f1-7a8e-40ae-a935-8b8bd59d8d60',
    slug: 'what-enterprise-sites-know-that-templates-don-t',
    title: "What Enterprise Sites Know That Templates Don't",
    blockKey: 'b234301df652',
    before: 'AWS Amplify',
    after: 'How Do You Deploy with AWS Amplify?',
  },
  {
    docId: '9b7767f1-7a8e-40ae-a935-8b8bd59d8d60',
    slug: 'what-enterprise-sites-know-that-templates-don-t',
    title: "What Enterprise Sites Know That Templates Don't",
    blockKey: 'e347331a69c1',
    before: 'Summary',
    after: 'What Did We Learn?',
  },

  // the-coffee-shop-just-outside-of-boston (3 h2, 0 questions -> rewrite all 3)
  {
    docId: '315e1395-8bf9-4f78-b779-1dbeb36aff71',
    slug: 'the-coffee-shop-just-outside-of-boston',
    title: 'The Coffee Shop Just Outside of Boston',
    blockKey: '960f9bb44ba6',
    before: 'The Invisible Divide',
    after: 'What Is the Invisible Divide in AI Adoption?',
  },
  {
    docId: '315e1395-8bf9-4f78-b779-1dbeb36aff71',
    slug: 'the-coffee-shop-just-outside-of-boston',
    title: 'The Coffee Shop Just Outside of Boston',
    blockKey: '1a141116205a',
    before: 'The Mirror Breaks',
    after: 'How Did the Mirror Break for Sarah\u2019s Team?',
  },
  {
    docId: '315e1395-8bf9-4f78-b779-1dbeb36aff71',
    slug: 'the-coffee-shop-just-outside-of-boston',
    title: 'The Coffee Shop Just Outside of Boston',
    blockKey: '63e2f1a75b96',
    before: 'The Feel of Grass',
    after: 'Why Does the Feel of Grass Matter in AI Design?',
  },

  // the-new-principal-agent-contract (4 h2, 0 questions -> rewrite all 4)
  {
    docId: 'f9f6950d-c012-4d31-8817-8b568df6f96a',
    slug: 'the-new-principal-agent-contract',
    title: 'The New Principal-Agent Contract',
    blockKey: 'e75ab6018c1d',
    before: 'The Classical Problem',
    after: 'What Is the Classical Principal-Agent Problem?',
  },
  {
    docId: 'f9f6950d-c012-4d31-8817-8b568df6f96a',
    slug: 'the-new-principal-agent-contract',
    title: 'The New Principal-Agent Contract',
    blockKey: 'a61dac005cd2',
    before: 'We\u2019ve Already Made This Trade',
    after: 'Why Have We Already Made This Trade?',
  },
  {
    docId: 'f9f6950d-c012-4d31-8817-8b568df6f96a',
    slug: 'the-new-principal-agent-contract',
    title: 'The New Principal-Agent Contract',
    blockKey: '64d924946bd3',
    before: 'Human-in-the-loop... kinda',
    after: 'How Does Human-in-the-Loop Work with AI Agents?',
  },
  {
    docId: 'f9f6950d-c012-4d31-8817-8b568df6f96a',
    slug: 'the-new-principal-agent-contract',
    title: 'The New Principal-Agent Contract',
    blockKey: '1b6e7c5a3ed1',
    before: 'Conclusion',
    after: 'What Is the New Principal-Agent Contract?',
  },

  // building-an-ai-chat-experience-for-your-personal-website (4 h2, 0 questions -> rewrite all 4)
  {
    docId: 'b0b933df-2f07-4952-bc77-e77e0b6e23e4',
    slug: 'building-an-ai-chat-experience-for-your-personal-website',
    title: 'Building an AI Chat Experience for Your Personal Website',
    blockKey: '37c09c4983b0',
    before: 'The Architecture',
    after: 'What Architecture Powers an AI Chat Widget?',
  },
  {
    docId: 'b0b933df-2f07-4952-bc77-e77e0b6e23e4',
    slug: 'building-an-ai-chat-experience-for-your-personal-website',
    title: 'Building an AI Chat Experience for Your Personal Website',
    blockKey: '992826f72ab4',
    before: 'Streaming: Making AI Feel Human',
    after: 'How Does Streaming Make AI Feel Human?',
  },
  {
    docId: 'b0b933df-2f07-4952-bc77-e77e0b6e23e4',
    slug: 'building-an-ai-chat-experience-for-your-personal-website',
    title: 'Building an AI Chat Experience for Your Personal Website',
    blockKey: '3ba15eb59157',
    before: 'Smart Hyperlinking: Seamless Project Discovery',
    after: 'How Does Smart Hyperlinking Aid Project Discovery?',
  },
  {
    docId: 'b0b933df-2f07-4952-bc77-e77e0b6e23e4',
    slug: 'building-an-ai-chat-experience-for-your-personal-website',
    title: 'Building an AI Chat Experience for Your Personal Website',
    blockKey: '767ff4cb659d',
    before: 'Lessons Learned',
    after: 'What Lessons Were Learned Building the Chat?',
  },

  // the-altivum-inc-tech-stack (3 h3, 0 questions -> rewrite all 3)
  {
    docId: 'dc718800-0695-4e93-a9a1-0c1afe6af73b',
    slug: 'the-altivum-inc-tech-stack',
    title: 'The Altivum\u00ae Inc. Tech Stack',
    blockKey: '40a0c963916f',
    before: 'Hardware & Compute',
    after: 'What Hardware and Compute Does Altivum Use?',
  },
  {
    docId: 'dc718800-0695-4e93-a9a1-0c1afe6af73b',
    slug: 'the-altivum-inc-tech-stack',
    title: 'The Altivum\u00ae Inc. Tech Stack',
    blockKey: '4b32cae759f0',
    before: 'Inference',
    after: 'How Does Altivum Run AI Inference?',
  },
  {
    docId: 'dc718800-0695-4e93-a9a1-0c1afe6af73b',
    slug: 'the-altivum-inc-tech-stack',
    title: 'The Altivum\u00ae Inc. Tech Stack',
    blockKey: '8b361005f9e6',
    before: 'Deep Research',
    after: 'How Does Altivum Do Deep Research?',
  },

  // the-internets-new-users-are-not-humans (4 h3, 0 questions -> rewrite all 4)
  {
    docId: '45429f38-a633-4eae-a517-653780069c24',
    slug: 'the-internets-new-users-are-not-humans',
    title: "The Internet's New Users Are Not Humans",
    blockKey: 'e8c9c1a8eb0e',
    before: 'The OpenClaw Explosion',
    after: 'What Is the OpenClaw Explosion?',
  },
  {
    docId: '45429f38-a633-4eae-a517-653780069c24',
    slug: 'the-internets-new-users-are-not-humans',
    title: "The Internet's New Users Are Not Humans",
    blockKey: '723d26ec0337',
    before: 'The Infrastructure Is Being Rebuilt for Agents',
    after: 'How Is the Internet Being Rebuilt for Agents?',
  },
  {
    docId: '45429f38-a633-4eae-a517-653780069c24',
    slug: 'the-internets-new-users-are-not-humans',
    title: "The Internet's New Users Are Not Humans",
    blockKey: 'ffeacb95eca7',
    before: 'The Cloud Giants Are Betting on Agentic Infrastructure',
    after: 'Why Are Cloud Giants Betting on Agentic Infrastructure?',
  },
  {
    docId: '45429f38-a633-4eae-a517-653780069c24',
    slug: 'the-internets-new-users-are-not-humans',
    title: "The Internet's New Users Are Not Humans",
    blockKey: '889fb6281ac5',
    before: 'Build for the Model of Tomorrow',
    after: 'How Should Builders Prepare for the Model of Tomorrow?',
  },

  // the-state-of-the-tech-quantum-computing-on-aws-2026 (6 h3, 1 question -> rewrite 5, keep "Why a Hyperscaler In Lieu of a Lab")
  {
    docId: '792ecb84-f350-495e-9982-ddb53afd67db',
    slug: 'the-state-of-the-tech-quantum-computing-on-aws-2026',
    title: 'The State of the Tech: Quantum Computing on AWS (2026)',
    blockKey: '37f5d46db5cf',
    before: 'The Honest State of the Hardware',
    after: 'What Is the Honest State of Quantum Hardware?',
  },
  {
    docId: '792ecb84-f350-495e-9982-ddb53afd67db',
    slug: 'the-state-of-the-tech-quantum-computing-on-aws-2026',
    title: 'The State of the Tech: Quantum Computing on AWS (2026)',
    blockKey: '9cdaee946078',
    before: 'Use Case #1 - Optimization & Logistics',
    after: 'How Does Quantum Computing Help Optimization and Logistics?',
  },
  {
    docId: '792ecb84-f350-495e-9982-ddb53afd67db',
    slug: 'the-state-of-the-tech-quantum-computing-on-aws-2026',
    title: 'The State of the Tech: Quantum Computing on AWS (2026)',
    blockKey: 'e9d1e2659223',
    before: 'Use Case #2 - Quantum Machine Learning',
    after: 'What Is Quantum Machine Learning?',
  },
  {
    docId: '792ecb84-f350-495e-9982-ddb53afd67db',
    slug: 'the-state-of-the-tech-quantum-computing-on-aws-2026',
    title: 'The State of the Tech: Quantum Computing on AWS (2026)',
    blockKey: 'c54f795e6316',
    before: 'From Prototype to Production',
    after: 'How Do You Move Quantum Prototypes to Production?',
  },
  {
    docId: '792ecb84-f350-495e-9982-ddb53afd67db',
    slug: 'the-state-of-the-tech-quantum-computing-on-aws-2026',
    title: 'The State of the Tech: Quantum Computing on AWS (2026)',
    blockKey: '01f5e5b11326',
    before: 'The Bottom Line',
    after: 'What Is the Bottom Line on Quantum Computing in 2026?',
  },

  // the-incognito-button-should-be-more-prominent (4 h2, 2 questions -> rewrite 2 to reach >=50% full-page ratio
  // once BlogPost.tsx's own chrome headings are counted; those now read
  // "Who is the Author?" / "What Should You Read Next?", so they count as questions themselves)
  {
    docId: 'df3d07f3-04b4-4195-8e20-f405ebd11e0e',
    slug: 'the-incognito-button-should-be-more-prominent',
    title: 'The Incognito Button Should Be More Prominent',
    blockKey: '9a93ba5ae1fe',
    before: 'Every question is a write to your profile',
    after: 'Why Is Every Question a Write to Your Profile?',
  },
  {
    docId: 'df3d07f3-04b4-4195-8e20-f405ebd11e0e',
    slug: 'the-incognito-button-should-be-more-prominent',
    title: 'The Incognito Button Should Be More Prominent',
    blockKey: '126e08c424cd',
    before: 'The tools exist.',
    after: 'What Tools Already Exist?',
  },
];

// -----------------------------------------------------------------------------
// Insert plan: a single question-form H2 added to posts with zero H2/H3.
// Each entry: { docId, slug, title, afterBlockKey, headingText }
// -----------------------------------------------------------------------------
export const INSERTIONS = [
  {
    docId: 'da4d0e48-b456-49fe-8f5a-a32170d6cc71',
    slug: 'make-it-exist-then-make-it-perfect-building-with-partyrock',
    title: 'Make It Exist, Then Make It Perfect: Building with PartyRock',
    afterBlockKey: 'bcc4c1650256',
    headingText: 'How Do You Start Building with AI on AWS?',
  },
  {
    docId: '4b52c782-0e61-4d04-9bed-fb2c08302d3c',
    slug: 'control-the-controllable-influence-the-variables',
    title: 'Control the Controllable. Influence the Variables.',
    afterBlockKey: '329cabab28d0',
    headingText: 'What Does It Mean to Control the Controllable?',
  },
  {
    docId: 'b26404b6-d74c-409f-aa1c-95c2bc21989e',
    slug: 'the-paradox-of-good-days',
    title: 'The Paradox of Good Days',
    afterBlockKey: '07eb7471efd2',
    headingText: 'Why Do Good Days Require the Hard Ones?',
  },
  {
    docId: '11a7a113-03d9-47a2-9e4a-74a33ba5cd1b',
    slug: 'the-entrepreneurial-operating-system-in-the-age-of-ai',
    title: 'The Entrepreneurial Operating System in the Age of AI',
    afterBlockKey: '84164f945e86',
    headingText: 'How Does EOS Fit the Age of AI?',
  },
  {
    docId: 'ced11628-d7b8-478e-8e29-efb709d8e6fb',
    slug: 'the-new-tokenomics-a-metric-that-will-define-enterprise-ai',
    title: 'The New Tokenomics: A Metric That Will Define Enterprise AI',
    afterBlockKey: 'd05e4cba4c78',
    headingText: 'What Is the New Tokenomics of Enterprise AI?',
  },
  {
    docId: 'c52c9364-0572-4735-8422-ecbffaeb7d0d',
    slug: 'dear-builder-welcome-to-quantum-computing',
    title: 'Dear Builder, Welcome to Quantum Computing',
    afterBlockKey: 'aa77baa90782',
    headingText: 'What Problems Can Quantum Computing Solve?',
  },
  {
    docId: '67bd172e-e39e-43d1-ba23-838089056b34',
    slug: 'fault-tolerance-quantum-s-hardest-problem-has-an-end-date',
    title: "Fault Tolerance: Quantum's Hardest Problem Has an End-Date",
    afterBlockKey: 'f75893199844',
    headingText: 'What Is Quantum Fault Tolerance and Why Does It Matter?',
  },
  {
    docId: '08f9246f-2a5a-455a-aa0f-bf41f46e0cec',
    slug: 'the-modern-caste-system',
    title: 'The Modern Caste System',
    afterBlockKey: '97433acc19d0',
    headingText: 'Is a New Digital Caste System Forming Around AI?',
  },
];
