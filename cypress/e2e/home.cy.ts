describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the page successfully', () => {
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should display the hero section with the hero image', () => {
    cy.get('section')
      .first()
      .within(() => {
        cy.get('img[alt="Leadership Forged in Service"]').should('exist');
      });
  });

  it('should have a visually hidden h1 for accessibility and SEO', () => {
    cy.get('h1').should('exist');
    cy.get('h1').should('have.class', 'sr-only');
    cy.get('h1').should('contain.text', 'Christian Perez');
  });

  it('should have correct SEO meta tags', () => {
    cy.verifySEO('Christian Perez');
    cy.get('head meta[property="og:url"]').should('have.attr', 'content').and('include', 'thechrisgrey.com');
  });

  it('should display the navigation bar', () => {
    cy.verifyNavigation();
  });

  it('should display the sticky profile section with key points', () => {
    // The section with 525vh/600vh height exists
    cy.get('section').eq(1).should('exist');

    // Profile image is present
    cy.get('img[alt="Christian Perez"]').should('exist');
  });

  it('should show key points as the user scrolls', () => {
    // Scroll past the hero section to trigger key points
    cy.scrollTo(0, 1500, { duration: 500 });

    // First key point should become visible
    cy.contains('Personal Biography').should('exist');
    cy.contains('Altivum Inc').should('exist');
    cy.contains('The Vector Podcast').should('exist');
    cy.contains('Beyond the Assessment').should('exist');
    cy.contains('Amazon Web Services').should('exist');
  });

  it('should display the CTA section with social links', () => {
    // Scroll to the CTA section at the bottom of the page
    cy.get('section').last().scrollIntoView();
    cy.contains('h2', "Let's Connect").should('be.visible');
    cy.contains('LinkedIn').should('be.visible');
    cy.contains('Instagram').should('be.visible');
  });

  it('should have social links that open in a new tab', () => {
    cy.get('section').last().scrollIntoView();
    cy.get('a[href*="linkedin.com"]')
      .should('have.attr', 'target', '_blank')
      .and('have.attr', 'rel')
      .and('include', 'noopener');

    cy.get('a[href*="instagram.com"]')
      .should('have.attr', 'target', '_blank')
      .and('have.attr', 'rel')
      .and('include', 'noopener');
  });

  it('should have a link to the full socials page', () => {
    cy.get('section').last().scrollIntoView();
    cy.contains('Check out the rest of my socials').should('have.attr', 'href', '/links');
  });

  it('should display the footer', () => {
    cy.get('section').last().scrollIntoView();
    cy.verifyFooter();
  });

  it('should display the chat widget FAB', () => {
    cy.get('button[aria-label="Open chat with Alti"]').should('be.visible');
  });

  it('should be responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.get('h1').should('exist');
    cy.get('img[alt="Leadership Forged in Service"]').should('exist');
  });
});
