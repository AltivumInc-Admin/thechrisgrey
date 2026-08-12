describe('Mobile Navigation', () => {
  beforeEach(() => {
    cy.viewport('iphone-x');
    cy.visit('/');
  });

  it('should display the hamburger menu button', () => {
    cy.get('button[aria-label="Open menu"]').should('be.visible');
  });

  it('should not display desktop nav links on mobile', () => {
    // Desktop nav items are in a div.hidden.md:flex which is display:none on mobile
    cy.get('nav a[href="/blog"]').should('not.be.visible');
    cy.get('nav a[href="/contact"]').should('not.be.visible');
  });

  it('should open the mobile menu when clicking the hamburger button', () => {
    cy.get('button[aria-label="Open menu"]').click();

    // The mobile menu is rendered in a div.md:hidden with pb-4 class (not the button)
    // Verify links are visible by checking the mobile menu links directly
    cy.get('nav div.md\\:hidden').within(() => {
      cy.contains('Home').should('be.visible');
      cy.contains('Blog').should('be.visible');
      cy.contains('Alti').should('be.visible');
      cy.contains('Links').should('be.visible');
      cy.contains('Contact').should('be.visible');
    });
  });

  it('should display the About section with all sub-items in mobile menu', () => {
    cy.get('button[aria-label="Open menu"]').click();

    cy.get('nav div.md\\:hidden').within(() => {
      // About section header
      cy.contains('About').should('be.visible');

      // Sub-items
      cy.contains('Personal Biography').should('be.visible');
      cy.contains('Altivum Inc').should('be.visible');
      cy.contains('The Vector Podcast').should('be.visible');
      cy.contains('Beyond the Assessment').should('be.visible');
      cy.contains('Amazon Web Services').should('be.visible');
    });
  });

  it('should close the mobile menu after clicking the close button', () => {
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('button[aria-label="Close menu"]').should('be.visible');
    cy.get('button[aria-label="Close menu"]').click();

    // Mobile menu div should no longer exist (hamburger button still has md:hidden)
    cy.get('nav div.md\\:hidden').should('not.exist');
  });

  it('should navigate to a page and close the mobile menu', () => {
    cy.get('button[aria-label="Open menu"]').click();

    // Click the Contact link inside the mobile menu
    cy.get('nav div.md\\:hidden').contains('Contact').click();

    cy.url().should('include', '/contact');
    // Menu should be closed after navigation
    cy.get('button[aria-label="Open menu"]').should('be.visible');
  });

  it('should navigate to an About sub-page from mobile menu', () => {
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('nav div.md\\:hidden').contains('Personal Biography').click();

    cy.url().should('include', '/about');
  });

  it('should navigate to Altivum from mobile menu', () => {
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('nav div.md\\:hidden').contains('Altivum Inc').click();

    cy.url().should('include', '/altivum');
  });

  it('should display the logo on mobile', () => {
    cy.get('nav').within(() => {
      cy.get('img[alt="TCG Logo"]').should('be.visible');
    });
  });

  it('should display the chat widget on mobile', () => {
    cy.get('button[aria-label="Open chat with Alti"]').should('be.visible');
  });
});
