describe('About Page - Personal Biography', () => {
  beforeEach(() => {
    cy.visit('/about');
  });

  it('should load the page successfully', () => {
    cy.url().should('include', '/about');
  });

  it('should have a visually hidden h1 for accessibility', () => {
    cy.get('h1').should('exist');
    cy.get('h1').should('contain.text', 'About Christian Perez');
  });

  it('should have correct SEO meta tags', () => {
    cy.verifySEO('About Christian Perez');
  });

  it('should display the hero section with biography image', () => {
    // The hero wordmark is intentionally decorative: it carries alt="" because the
    // sr-only <h1> above it supplies the accessible name, so asserting on alt text
    // would re-introduce a duplicate announcement. It is also rendered through
    // <ResponsiveImage>, i.e. an <img> inside a <picture> with AVIF/WebP sources.
    cy.get('picture img').should('be.visible');
  });

  it('should display biography content', () => {
    // The biography section should have visible text content
    cy.get('section').should('have.length.greaterThan', 1);
  });

  it('should display the navigation bar', () => {
    cy.verifyNavigation();
  });

  it('should display the footer', () => {
    cy.verifyFooter();
  });

  it('should be responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.get('h1').should('exist');
  });
});

describe('Altivum Inc Page', () => {
  beforeEach(() => {
    cy.visit('/altivum');
  });

  it('should load the page successfully', () => {
    cy.url().should('include', '/altivum');
  });

  it('should have correct SEO meta tags', () => {
    cy.verifySEO('Altivum');
  });

  it('should display key company information', () => {
    cy.contains('Altivum').should('be.visible');
  });

  // Same AEO rewrite: "The Vision" and "Building for Impact" became question-form
  // headings.
  it('should display timeline or content sections', () => {
    cy.contains('What is the road ahead for Altivum?').should('be.visible');
    cy.contains('How does Altivum build for impact?').should('be.visible');
  });

  it('should display the navigation bar', () => {
    cy.verifyNavigation();
  });

  it('should display the footer', () => {
    cy.verifyFooter();
  });

  it('should be responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.contains('Altivum').should('be.visible');
  });
});

describe('Podcast Page', () => {
  beforeEach(() => {
    // Stub podcast guest API
    cy.intercept('GET', '**/uaxzdsfa**sanity.io/**', {
      statusCode: 200,
      body: { result: [] },
    }).as('podcastGuests');

    cy.visit('/podcast');
  });

  it('should load the page successfully', () => {
    cy.url().should('include', '/podcast');
  });

  it('should have correct SEO meta tags', () => {
    cy.verifySEO('The Vector Podcast');
  });

  it('should display the podcast logo or branding', () => {
    cy.get('img[alt*="Vector Podcast"]').should('exist');
  });

  it('should display episode content', () => {
    // There should be at least one episode visible
    cy.get('section').should('have.length.greaterThan', 1);
  });

  it('should display the navigation bar', () => {
    cy.verifyNavigation();
  });

  it('should display the footer', () => {
    cy.verifyFooter();
  });

  it('should be responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.url().should('include', '/podcast');
  });
});

describe('Beyond the Assessment Page', () => {
  beforeEach(() => {
    cy.visit('/beyond-the-assessment');
  });

  it('should load the page successfully', () => {
    cy.url().should('include', '/beyond-the-assessment');
  });

  it('should have a visually hidden h1 for accessibility', () => {
    cy.get('h1').should('exist');
    cy.get('h1').should('contain.text', 'Beyond the Assessment');
  });

  it('should have correct SEO meta tags', () => {
    cy.verifySEO('Beyond the Assessment');
  });

  it('should display the book hero image', () => {
    cy.get('img[alt="Beyond the Assessment"]').should('exist');
  });

  it('should display book content or description', () => {
    // The reading/book image should exist in the content section
    cy.get('section').should('have.length.greaterThan', 1);
  });

  it('should display the navigation bar', () => {
    cy.verifyNavigation();
  });

  it('should display the footer', () => {
    cy.verifyFooter();
  });

  it('should be responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.get('h1').should('exist');
  });
});

describe('AWS Page', () => {
  beforeEach(() => {
    cy.visit('/aws');
  });

  it('should load the page successfully', () => {
    cy.url().should('include', '/aws');
  });

  it('should have correct SEO meta tags', () => {
    cy.verifySEO('Amazon Web Services');
  });

  it('should display the AWS hero image', () => {
    cy.get('section').first().should('exist');
  });

  // The AEO restructure replaced the old topical section headings ("AI & Machine
  // Learning", "Cloud Architecture", "Community & Content") with question-form
  // headings so the page answers queries directly. Assert the current headings.
  it('should display focus areas', () => {
    cy.contains('What is the AWS Community Builders program?').should('be.visible');
    cy.contains('What AWS services does Christian work with?').should('be.visible');
    cy.contains('What is the infrastructure stack?').should('be.visible');
  });

  it('should display AWS service names', () => {
    cy.contains('Amazon Bedrock').should('be.visible');
    cy.contains('Lambda').should('be.visible');
  });

  it('should display the navigation bar', () => {
    cy.verifyNavigation();
  });

  it('should display the footer', () => {
    cy.verifyFooter();
  });

  it('should be responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.contains('What AWS services does Christian work with?').should('be.visible');
  });
});

describe('Cross-Page Navigation from About Dropdown', () => {
  it('should navigate through all About sub-pages sequentially', () => {
    // Start at About
    cy.visit('/about');
    cy.url().should('include', '/about');

    // Navigate to Altivum from dropdown
    cy.get('button[aria-label="About menu"]').click();
    cy.get('[role="menu"]').contains('Altivum Inc').click();
    cy.url().should('include', '/altivum');

    // Navigate to Podcast from dropdown
    cy.get('button[aria-label="About menu"]').click();
    cy.get('[role="menu"]').contains('The Vector Podcast').click();
    cy.url().should('include', '/podcast');

    // Navigate to BTA from dropdown
    cy.get('button[aria-label="About menu"]').click();
    cy.get('[role="menu"]').contains('Beyond the Assessment').click();
    cy.url().should('include', '/beyond-the-assessment');

    // Navigate to AWS from dropdown
    cy.get('button[aria-label="About menu"]').click();
    cy.get('[role="menu"]').contains('Amazon Web Services').click();
    cy.url().should('include', '/aws');
  });
});
