# Ideas to Consider

## Portfolio/Projects Showcase

**Goal:** Allow visitors to explore projects and sites I've built without the page feeling too busy or the implementation looking cheesy.

---

### Option 1: Device Mockups

Show live sites inside a MacBook or phone frame. Click to expand into a full interactive modal.

**Pros:**
- Feels polished and intentional
- Device frame adds visual context
- Interactive on demand, not forced

**Cons:**
- More complex to implement well
- Need to handle responsive device frames

**Implementation notes:**
- Could use CSS-only device frames or a library
- Modal opens with full iframe, close button returns to gallery
- Consider lazy-loading iframes only when modal opens

---

### Option 2: Screenshot Grid with Modal Preview

Clean card grid with static screenshots. Click opens a modal with the live iframe embedded.

**Pros:**
- Clean initial view, no iframe overhead
- User opts into the interactive experience
- Screenshots load fast, iframe loads on demand
- Fits the current minimalist design language

**Cons:**
- Screenshots can get stale if sites change
- Two-step interaction (click to preview, click to visit)

**Implementation notes:**
- Screenshot cards with subtle hover effect (scale, border glow)
- Modal with iframe + "Visit Site" external link button
- Could add project title, tech stack badges on cards

---

### Design Considerations

- Both options should respect the site's aesthetic: thin borders, generous whitespace, subtle animations
- Modal backdrop should use `bg-altivum-dark/90 backdrop-blur-md` for consistency
- Consider X-Frame-Options - some sites may not allow embedding (have fallback)
- Mobile: possibly skip iframe entirely and just link to live site

---

### Sites to Potentially Showcase

- Altivum.io
- VetROI
- GradROI
- The Vector Podcast site
- Client projects (with permission)

---

## AI Chat: Amazon Bedrock Knowledge Base

**Goal:** Upgrade the AI assistant from static system prompt to dynamic RAG (Retrieval-Augmented Generation) so it can answer specific questions about blog posts, podcast episodes, book content, etc.

---

### Current State

The AI chat uses a hardcoded system prompt in `lambda/chat-stream/index.mjs` with general facts about Christian. It works well for broad questions but can't answer specifics like "What did you discuss in episode 12?" or "What's in Chapter 3 of your book?"

---

### Proposed Architecture

```
User question
    → Query Bedrock Knowledge Base
    → Retrieve relevant chunks
    → Inject into prompt
    → Claude generates contextual response
```

---

### Components

1. **S3 Bucket** - Store source documents:
   - Blog posts (exported from Sanity or scraped)
   - Podcast transcripts
   - Book excerpts / chapter summaries
   - Website page content

2. **Bedrock Knowledge Base** - Managed RAG service:
   - Auto-chunks documents
   - Embeds with Titan Embeddings
   - Stores vectors in OpenSearch Serverless

3. **Updated Lambda** - Modified chat handler:
   - Call `RetrieveAndGenerate` or `Retrieve` API
   - Pass retrieved context to Claude
   - Maintain conversation flow

---

### Benefits

- AI can answer specific questions about any indexed content
- No need to manually update system prompt when content changes
- Scales with content volume
- Could index new blog posts automatically via webhook

---

### Considerations

- **Cost**: OpenSearch Serverless has baseline cost (~$700/mo minimum for production)
  - Alternative: Use Pinecone free tier for experimentation
- **Sync**: Need process to keep knowledge base updated when Sanity content changes
- **Chunking strategy**: May need tuning for optimal retrieval

---

### Implementation Steps

1. Create S3 bucket for source documents
2. Export/sync content (blog posts, transcripts, etc.)
3. Create Bedrock Knowledge Base with OpenSearch Serverless (or Pinecone)
4. Update Lambda to query knowledge base before calling Claude
5. Test retrieval quality and tune chunking if needed
6. Set up sync process for new content
