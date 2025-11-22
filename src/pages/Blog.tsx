import { useState } from 'react';
import { SEO } from '../components/SEO';
import { typography } from '../utils/typography';
import vetImage from '../assets/vet.jpeg';
import ktocImage from '../assets/ktoc.jpeg';
// import cloudArchImage from '../assets/cloud-arch.jpg'; // Removed unused import
// If cloud-arch.jpg doesn't exist, I'll use a placeholder or keep the existing one if it was there.
// Checking previous file content, it used placeholders. I will use vetImage for the new one.

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content: string[]; // Array of paragraphs
  date: string;
  category: string;
  image: string;
  pdfUrl?: string;
}

const Blog = () => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const blogPosts: BlogPost[] = [
    {
      id: 1,
      title: "From Keating to Coding",
      excerpt: "In the 1989 film Dead Poets Society, Robin Williams delivers one of cinema's most enduring performances as John Keating, an English teacher who dares to treat language as more than mere academic formality. To Keating, words are weapons against conformity, vessels for purpose, and catalysts for change.",
      content: [
        "In the 1989 film Dead Poets Society, Robin Williams delivers one of cinema's most enduring performances as John Keating, an English teacher who dares to treat language as more than mere academic formality. To Keating, words are weapons against conformity, vessels for purpose, and catalysts for change. The classroom becomes his battlefield, and language his chosen armament.",
        "He stands on desks not for theatrics, but to invite perspective. He tears pages from textbooks not for rebellion's sake, but to liberate meaning from rigid tradition. He encourages his students to think, speak, and write with conviction. \"No matter what anybody tells you,\" he says, \"words and ideas can change the world.\"",
        "That line—like much of the film—feels especially prophetic today because now, we are speaking not just to each other, but to machines. It turns out that our ability to shape those machines' outputs is still fundamentally dependent on the timeless lessons Keating tried to teach: word choice matters, syntax is power, and language—well-aimed—is revolutionary.",
        "The Prompt is the New Command Line",
        "We now live in an era of Generative Artificial Intelligence, where large language models (LLMs) like OpenAI's ChatGPT, Anthropic's Claude, and Google's Gemini can interpret human language and return text, code, images, and even decisions with uncanny coherence.",
        "What used to require extensive programming now requires a sentence.",
        "Want to generate a marketing plan? Draft a legal memo? Write Python code for a microservice? Summarize research from four disparate sources?",
        "Ask the right question, and an LLM can return exactly that—often in seconds. But therein lies the operative phrase: ask the right question. The model is only as useful as the prompt it's given. The difference between an LLM output that feels magical and one that feels mediocre often comes down to a handful of well-chosen words.",
        "This isn't new. We've always known that language can move markets, win elections, start wars, and end them. But now, language moves models. And that subtle shift has opened up a new discipline: prompt engineering.",
        "Prompt Engineering: The New Literacy",
        "Prompt engineering is the ability to communicate with an inference model using precise, strategically structured natural language in order to achieve a desired output. It's not programming, but it is programmatic. It doesn't require technical syntax—but it does demand logical clarity, linguistic precision, and domain awareness.",
        "What we're witnessing is the dawn of a new kind of literacy—not just digital fluency, but semantic control. It's not enough to type in \"generate a blog post\" and hope for brilliance. A vague prompt yields vague results. A lazy query returns generic answers. And a poorly framed question can lead a model astray—even if its underlying intelligence is state-of-the-art.",
        "To put it plainly: language is the new interface, and prompts are the new programming.",
        "Prompt engineering is about more than getting a chatbot to cooperate. It's about shaping the behavior of sophisticated neural networks trained on billions of parameters and petabytes of data. It's about having a conversation with all of human knowledge—and getting back something you can actually use.",
        "Keating, Concision, and Computational Semantics",
        "Let's revisit that iconic Keating quote:",
        "\"Avoid using the word 'very' because it's lazy. A man is not very tired, he is exhausted. Don't use 'very sad,' use morose... Language was invented for one reason, boys—to woo women—and in that endeavor, laziness will not do.\"",
        "Of course, Keating's quip about the evolutionary purpose of language is rhetorically playful. But behind the joke is a timeless insight: lazy language is ineffective language. Whether we're persuading a lover, a boardroom, or a transformer-based deep learning model, our success depends on the precision of our vocabulary and the intentionality of our expression.",
        "A prompt like, \"write a nice email\" may result in bland pleasantries. But a prompt like, \"write a warm yet assertive email to a client explaining a project delay while reinforcing trust in our delivery timeline\" will yield a result that actually serves your objective. One is vague and emotional. The other is strategic and precise.",
        "And just as Keating encouraged his students to embrace richer vocabulary, we must now consider the emotional and contextual weight of our words when prompting machines. \"Welcoming\" is not \"excited.\" \"Empathetic\" is not \"submissive.\" \"Direct\" is not \"abrasive.\" The nuance matters—because the machine does not guess what you meant. It reflects what you asked.",
        "Prompt Structures: A Brief Taxonomy",
        "Beyond vocabulary and tone, prompt structure also influences model behavior. There are a few key types of prompt strategies that every modern professional should understand:",
        "Zero-Shot Prompts: These give the model no examples—just a direct instruction. Example: \"Summarize this article in three bullet points.\" Useful for straightforward requests, but quality may vary depending on ambiguity.",
        "Few-Shot Prompts: These include examples of desired output to guide the model. Example: \"Here are three summaries of past articles. Now do the same for this one.\" Few-shot prompting improves reliability by establishing pattern recognition. It's particularly helpful when formatting or tone must remain consistent.",
        "Chain-of-Thought Prompts: These walk the model through a step-by-step reasoning process. Example: \"Let's first outline the problem, then define the stakeholders, then list possible solutions.\" This method dramatically improves the performance of LLMs on tasks requiring logical deduction or multistep synthesis.",
        "Each structure is a different way of wielding language—not just to retrieve information, but to shape cognition. It's the closest thing we have to a user manual for thinking machines.",
        "The Lexicon of the Future is Human",
        "There is a persistent misconception that as AI grows more advanced, it will eliminate the need for humans to \"speak machine.\" But the truth is the opposite. The more capable the machine becomes, the more vital it is that humans speak with intention.",
        "The rise of LLMs does not diminish the value of language—it amplifies it. It makes linguistic skill a superpower. In an age where machines can write code, analyze policy, generate visuals, or simulate personalities, the individual who can articulate ideas clearly becomes the architect of possibility.",
        "This reality isn't just for developers. Whether you're a CEO, a policy analyst, a high school teacher, or a transitioning veteran, prompt engineering is now part of your toolkit. The best communicators will wield AI as a force multiplier—not because they understand the underlying math, but because they understand the weight of a well-formed sentence.",
        "Conversations with Machines",
        "Here's the irony: in learning to talk to machines, we may become better at talking to each other. Prompts require clarity. They force reflection. They demand empathy—not in the emotional sense, but in the design sense. You must anticipate ambiguity, reduce assumptions, and express yourself clearly.",
        "In this way, prompting is not about telling AI what to do. It's about engaging in a kind of dialogue—a linguistic negotiation. And much like any relationship, the better you understand the other party's logic, the more effective your conversation becomes.",
        "Keating wanted his students to \"seize the day.\" But in a world of language models, the updated imperative might be: seize the syntax. Own your voice. Command your tools. Speak with precision—and let the machine meet your standard.",
        "Final Thought: The Renaissance is Semantic",
        "We are entering a renaissance not of art or industry, but of semantics. The next great technologists may not be software engineers but poets with precision. The ability to translate thought into language and language into action—across human and machine domains—is fast becoming the most valuable skill on the planet.",
        "So, let us return to the lesson John Keating left us with when referencing \"Oh me! Oh Life!\" by Walt Whitman:",
        "\"That the powerful play goes on, and you may contribute a verse.\"",
        "Today, that verse may take the form of a prompt, rendered in 300 tokens and parsed by a multi-billion-parameter model. But its origin remains the same: human imagination, channeled through language, toward something greater.",
        "\"And in that endeavor, laziness will not do.\"",
        "Afterward",
        "I first published this essay on LinkedIn earlier this year. Since then, my approach prompt engineering has evolved to some degree yet at its core, the essence of prompting has remained the same.",
        "Among the most valuable changes in my approach: I now ask models to generate phased plans of action for extended tasks. This simple shift clarifies ambiguity, unveils dependencies, and allows me to trust the AI to carry out its work unsupervised.",
        "While model preference will inevitably differ by workflow, I've found Anthropic's Claude Code, running natively in my terminal, delivers the most reliable performance for my needs.",
        "Yet at the heart of every output, amid shifting platforms and processes, the essential lesson persists: quality begins with the prompt.",
        "\"Master the basics.\" It's a credo in Special Operations, and I am continually reminded that it rings true far beyond the original context—here, too, in the dialogue between human and machine."
      ],
      date: "November 21, 2025",
      category: "Artificial Intelligence",
      image: ktocImage,
      pdfUrl: "/assets/documents/From Keating to Coding.pdf"
    },
    {
      id: 2,
      title: "Turning Tactical Skills Into Technical Impact",
      excerpt: "According to a 2023 Military Transition Survey conducted by the University of Phoenix, approximately 32% of non-active military members reported that they encountered obstacles transferring their military skills to the right civilian job.",
      content: [
        "According to a 2023 Military Transition Survey conducted by the University of Phoenix, approximately 32% of non-active military members reported that they encountered obstacles transferring their military skills to the right civilian job.",
        "If you or someone you know is a veteran interested in building with AWS, this article is for you.",
        "You receive a tasking: conduct a reconnaissance operation. This is unlike any reconnaissance operation you have ever conducted, although the insights gained from this operation will undeniably shape strategic decisions. Similarly to how reconnaissance missions involve simply observing behavior, your new mission is to develop and optimize software that provides key insights on clickstream data in order to better position your best selling products, drive user engagement, and increase total sales.",
        "The client that asked for this software has specific intelligence requirements. The client would like to learn as much as possible about user behavior patterns.",
        "Where are they coming from? What are they clicking on the most? How long are they staying on the site?",
        "But here is the constraint that matters: the data acquired is incredibly valuable and as such it must remain secure. The client cannot expose their analytical infrastructure to the open internet.",
        "This is where tactical doctrine translates brilliantly into cloud architecture.",
        "Your first step is to establish a Virtual Private Cloud (VPC). This is your operational area of responsibility. This is the defined space where you control every ingress and egress point. Within it, you create your public subnet (your forward position where traffic initially lands) and your private subnet (your secure command post where the actual intelligence analysis happens).",
        "The client's clickstream collection endpoint is fronted by an Application Programming Interface (API) Gateway endpoint at the public edge. It is still visible but it remains a hardened location designed to receive incoming data. The data analysis and storage, however, does not happen here. The public facing API receives, validates, and immediately passes the intelligence backward through a controlled channel intentionally and strategically directed by your route table and by the integration Lambda that runs inside your private subnet.",
        "Security is an absolute must. As you layer those security cordons from the inside out, you establish security groups around the public subnet with very explicit instructions, \"Allow HTTPS inbound on port 443 from anywhere. Deny everything else.\" Similarly, you position a security group around your private subnet but the instructions differ. These are more stringent given the sensitive nature of the intel analysis happening within. \"Only accept traffic originating from the public subnet's Elastic Network Interfaces (ENIs). Reject all traffic that does not meet this criteria.\"",
        "Your Network Access Control Lists (ACLs) broaden your security posture. This is a stateless perimeter check that evaluates traffic before it even gets close to your security groups. Its stateless nature is its strength. It does not care that it already checked your credentials when you came in, it will check your credentials again on the way out. No if's, and's, or but's.",
        "Together your route table, Network ACL, and Security Groups form a layered defense consisting of perimeter control, packet filtering, and stateful enforcement.",
        "We finally get to your actual mission. The clickstream data arrives at your API Gateway, which triggers a Lambda function. That Lambda function validates the incoming request, assumes its IAM role, then forwards the authenticated data into an SQS queue. You access the SQS through a VPC endpoint, ensuring your clickstream data never traverses the public internet. The queue remains reachable only through the SQS VPC endpoint from your private subnet. Functionally, this keeps the entire data path within your controlled area of operations, never exposed to routing through public infrastructure.",
        "Lambda functions, akin to troops tasked to run back and forth conducting a specific job, poll from that queue in controlled batches preserving the order of messages when using a FIFO queue. They process each click event, enrich it with geolocation data, session tracking, and detailed behavioral patterns. They take meticulous and organized notes. The longer unstructured notes go to your Data Lake. The detailed metadata gets neatly logged in DynamoDB.",
        "Eventually the client needs to see this intelligence. Perhaps they access it through a different controlled channel like a dashboard running on an EC2 instance in the private subnet, accessible only through AWS Systems Manager Session Manager, which routes through the AWS control plane and not the internet. Or they pull reports through a secured API that sits behind CloudFront and WAF, which applies additional filtering before anything reaches your infrastructure.",
        "Beneath all of this runs CloudTrail. Every API call, every Lambda invocation, every DynamoDB write, every IAM check that succeeded or failed gets logged with a timestamp and the identity of who actioned this. CloudTrail is your operational record. When you need answers, CloudTrail gives you the complete signal trace. If something goes sideways, you have the full record to understand exactly what happened and why. You have accountability.",
        "What is fascinating is of course the technical capability that we've just described but also the fact that as a veteran you already understand this. You know that layered defenses beat single perimeters. You have executed asynchronous operations, and you've planned operations with redundancy built in because single points of failure are unacceptable.",
        "The AWS services are just the terminology but the doctrine is already in your muscle memory.",
        "I hope that this short essay helps at least one veteran realize that what they learned in the service is still applicable and in turn this provides a sense of purpose.",
        "We lose too many veterans every day and now, more than ever, we need builders. We need you."
      ],
      date: "November 20, 2025",
      category: "Veterans in Tech",
      image: vetImage,
      pdfUrl: "/assets/documents/Turning Tactical Skills into Technical Impact.pdf"
    }
  ];

  const categories = ['All', 'Technology', 'Leadership', 'Veterans', 'Business'];

  return (
    <div className="min-h-screen bg-altivum-dark">
      <SEO
        title="Blog"
        description="Insights on AI, Cloud Architecture, and Leadership from Christian Perez."
        keywords="Christian Perez blog, AI insights, cloud architecture blog, veteran leadership, tech blog"
        url="https://thechrisgrey.com/blog"
        structuredData={[
          {
            "@type": "Blog",
            "name": "The Chris Grey Blog",
            "url": "https://thechrisgrey.com/blog",
            "description": "Insights on AI, Cloud Architecture, and Leadership",
            "author": {
              "@type": "Person",
              "name": "Christian Perez"
            },
            "blogPost": blogPosts.map(post => ({
              "@type": "BlogPosting",
              "headline": post.title,
              "description": post.excerpt,
              "datePublished": post.date,
              "author": {
                "@type": "Person",
                "name": "Christian Perez"
              }
            }))
          }
        ]}
        type="article"
      />
      {/* Hero Section */}
      <section className="py-32 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-block px-4 py-2 bg-altivum-gold/10 rounded-md mb-6">
              <span className="text-altivum-gold font-semibold text-sm uppercase tracking-wider">
                Blog
              </span>
            </div>

            <h1 className="text-white mb-6" style={typography.heroHeader}>
              Insights & Perspectives
            </h1>
            <div className="h-px w-24 bg-altivum-gold mb-8"></div>

            <p className="text-altivum-silver" style={typography.subtitle}>
              Thoughts on leadership, technology, veteran transition, and building organizations
              that make a difference.
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      {/* Categories */}
      <section className="py-8 bg-altivum-dark border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 ${category === 'All'
                  ? 'bg-white text-altivum-dark'
                  : 'bg-transparent text-altivum-silver border border-white/10 hover:border-altivum-gold hover:text-altivum-gold'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      {/* Blog Posts */}
      <section className="py-24 bg-altivum-dark">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="group cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                <div className="relative overflow-hidden rounded-lg mb-6 aspect-video">
                  <div className="absolute inset-0 bg-altivum-navy/20 group-hover:bg-transparent transition-colors duration-300 z-10"></div>
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-altivum-gold uppercase tracking-wider font-medium">
                    <span>{post.category}</span>
                    <span>•</span>
                    <span>{post.date}</span>
                  </div>
                  <h3 className="text-white group-hover:text-altivum-gold transition-colors" style={typography.cardTitleLarge}>
                    {post.title}
                  </h3>
                  <p className="text-altivum-silver line-clamp-3" style={typography.bodyText}>
                    {post.excerpt}
                  </p>
                  <div className="inline-flex items-center text-altivum-gold text-sm font-medium mt-2 group-hover:translate-x-2 transition-transform">
                    Read Article <span className="material-icons text-sm ml-1">arrow_forward</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      {/* Newsletter Section */}
      <section className="py-24 bg-altivum-dark border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-white mb-6" style={typography.sectionHeader}>
            Stay Informed
          </h2>
          <p className="text-altivum-silver mb-10" style={typography.bodyText}>
            Subscribe to receive new articles directly to your inbox. No spam, just valuable
            insights on leadership, technology, and growth.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 bg-transparent border-b border-white/20 text-white placeholder-altivum-silver/50 focus:outline-none focus:border-altivum-gold transition-colors rounded-none"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-white text-altivum-dark font-medium hover:bg-altivum-gold transition-colors duration-200"
            >
              Subscribe
            </button>
          </form>
          <p className="text-xs text-altivum-silver/40 mt-6">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </section>

      {/* Blog Post Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedPost(null)}
          ></div>
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-altivum-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">

            {/* Modal Header Image */}
            <div className="relative h-64 sm:h-80 flex-shrink-0">
              <img
                src={selectedPost.image}
                alt={selectedPost.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-altivum-dark via-altivum-dark/50 to-transparent"></div>
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-altivum-gold text-white rounded-full transition-colors backdrop-blur-md"
              >
                <span className="material-icons">close</span>
              </button>

              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-4 text-xs text-altivum-gold uppercase tracking-wider font-medium mb-3">
                  <span>{selectedPost.category}</span>
                  <span>•</span>
                  <span>{selectedPost.date}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 font-display">
                  {selectedPost.title}
                </h2>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="prose prose-invert prose-lg max-w-none">
                {selectedPost.content.map((paragraph, index) => (
                  <p key={index} className="text-altivum-silver mb-6 leading-relaxed font-light">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Download PDF Option */}
              {selectedPost.pdfUrl && (
                <div className="mt-12 pt-8 border-t border-white/10">
                  <div className="bg-white/5 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border border-white/5 hover:border-altivum-gold/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-altivum-gold/10 rounded-lg flex items-center justify-center text-altivum-gold">
                        <span className="material-icons text-3xl">picture_as_pdf</span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-lg">Download Article PDF</h4>
                        <p className="text-altivum-silver text-sm">Read the full article offline</p>
                      </div>
                    </div>
                    <a
                      href={selectedPost.pdfUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-altivum-gold text-altivum-dark font-semibold rounded-lg hover:bg-white transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      Download PDF
                      <span className="material-icons text-sm">download</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default Blog;
