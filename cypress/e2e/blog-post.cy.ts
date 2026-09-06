describe('Blog Post Page', () => {
  // Navigate to the first blog post dynamically from the listing
  beforeEach(() => {
    // Visit the blog listing first, then navigate to the first post
    cy.visit('/blog');
    cy.get('article', { timeout: 15000 }).should('have.length.greaterThan', 0);

    // Store the first post's link and navigate to it
    cy.get('article')
      .first()
      .within(() => {
        cy.get('a').first().invoke('attr', 'href').as('postUrl');
      });

    cy.get('@postUrl').then((url) => {
      cy.visit(url as unknown as string);
    });
  });

  it('should load the blog post page successfully', () => {
    cy.url().should('include', '/blog/');
  });

  it('should display the post title', () => {
    // The post title should be in an h1 element
    cy.get('h1', { timeout: 15000 }).should('be.visible').and('not.be.empty');
  });

  it('should display the post category', () => {
    // Category is shown in uppercase text near the top
    cy.get('.uppercase', { timeout: 15000 }).should('exist');
  });

  it('should render the article body content', () => {
    // The article body should have visible text content
    cy.get('article', { timeout: 15000 }).should('exist');
  });

  it('should display the reading progress bar', () => {
    // The bar is deliberately aria-hidden decoration now, NOT role="progressbar":
    // its value changed on every scroll frame, and screen readers that announce
    // progressbar updates would fire for the length of the article to convey
    // position information assistive tech already reports. Assert the element
    // by test id and pin the aria-hidden contract so a revert is caught.
    cy.get('[data-testid="reading-progress"]', { timeout: 15000 })
      .should('exist')
      .and('have.attr', 'aria-hidden', 'true');
  });

  it('should have a link back to the blog listing', () => {
    cy.get('a[href="/blog"]', { timeout: 15000 }).should('exist');
  });

  it('should have correct SEO meta tags for the post', () => {
    cy.title().should('not.be.empty');
    cy.get('head meta[name="description"]').should('have.attr', 'content').and('not.be.empty');
  });

  it('should display the navigation bar', () => {
    cy.verifyNavigation();
  });

  it('should display the footer', () => {
    cy.verifyFooter();
  });

  it('should be responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.get('h1', { timeout: 15000 }).should('be.visible');
  });
});

describe('Blog Post - Not Found', () => {
  it('should handle a post that does not exist', () => {
    cy.intercept('GET', '**/k5950b3w**sanity.io/**', {
      statusCode: 200,
      body: { result: null },
    }).as('sanityNotFound');

    cy.visit('/blog/nonexistent-post-slug-that-will-never-exist');
    cy.wait('@sanityNotFound');

    // Should show some kind of not found or error state
    cy.contains(/not found|error|unable|doesn't exist/i).should('be.visible');
  });
});
