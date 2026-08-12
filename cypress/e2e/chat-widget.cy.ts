describe('Chat Widget', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });

    cy.stubChatEndpoint();
    cy.visit('/about');
  });

  it('should display the chat widget FAB button', () => {
    cy.get('button[aria-label="Open chat with Alti"]').should('be.visible');
  });

  it('should have correct aria attributes on the FAB', () => {
    cy.get('button[aria-label="Open chat with Alti"]').should('have.attr', 'aria-expanded', 'false');
  });

  it('should open the chat panel when clicking the FAB', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"][aria-label="Alti - Altivum\'s AI Agent"]').should('be.visible');
  });

  it('should update the FAB aria attributes when open', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    // After opening, the FAB label changes to "Close chat" and has aria-expanded="true"
    // There are two "Close chat" buttons (FAB + panel header), target the one with aria-expanded
    cy.get('button[aria-label="Close chat"][aria-expanded="true"]').should('exist');
  });

  it('should display the welcome message in the widget panel', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      cy.contains("Altivum's official AI Agent").should('be.visible');
    });
  });

  it('should display the header with the Alti label and status dot', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      cy.contains('Alti').should('be.visible');
    });
  });

  it('should display the expand, and close buttons in the panel header', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      cy.get('button[aria-label="Open full chat"]').should('be.visible');
      cy.get('button[aria-label="Close chat"]').should('be.visible');
    });
  });

  it('should display the chat input in the widget panel', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      cy.get('textarea[aria-label="Type a message"]').should('be.visible');
    });
  });

  it('should send a message in the widget', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      cy.get('textarea[aria-label="Type a message"]').type('Hello{enter}');
      cy.contains('Hello').should('be.visible');
    });
  });

  it('should receive a response in the widget', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      cy.get('textarea[aria-label="Type a message"]').type('Who is Christian?{enter}');
      cy.contains('Founder and CEO', { timeout: 15000 }).should('be.visible');
    });
  });

  it('should show the Clear button after sending a message', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      cy.get('textarea[aria-label="Type a message"]').type('Hello{enter}');
      cy.get('button[aria-label="Clear conversation"]').should('be.visible');
    });
  });

  it('should close the widget panel when clicking the close button', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();
    cy.get('[role="dialog"]').should('be.visible');

    cy.get('[role="dialog"]').within(() => {
      cy.get('button[aria-label="Close chat"]').click();
    });

    cy.get('[role="dialog"]').should('not.exist');
  });

  it('should close the widget panel when pressing Escape', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();
    cy.get('[role="dialog"]').should('be.visible');

    cy.get('body').type('{esc}');
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('should close the widget when clicking the FAB while open', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();
    cy.get('[role="dialog"]').should('be.visible');

    // The FAB label changes to "Close chat" when open
    cy.get('button[aria-label="Close chat"]').last().click();
    cy.get('[role="dialog"]').should('not.exist');
  });

  it('should navigate to the full chat page when clicking expand', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      cy.get('button[aria-label="Open full chat"]').click();
    });

    cy.url().should('include', '/chat');
  });

  it('should display suggested prompts in the widget', () => {
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').within(() => {
      // Should show some kind of suggestions (either default or contextual)
      cy.get('button').filter(':contains("?")').should('have.length.greaterThan', 0);
    });
  });

  it('should not show the widget on the /chat page', () => {
    cy.visit('/chat');
    cy.get('button[aria-label="Open chat with Alti"]').should('not.exist');
  });

  it('should work on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.get('button[aria-label="Open chat with Alti"]').should('be.visible');
    cy.get('button[aria-label="Open chat with Alti"]').click();

    cy.get('[role="dialog"]').should('be.visible');
    cy.get('[role="dialog"]').within(() => {
      cy.get('textarea[aria-label="Type a message"]').should('be.visible');
    });
  });
});

describe('Chat Widget on Different Pages', () => {
  it('should be visible on the home page', () => {
    cy.visit('/');
    cy.get('button[aria-label="Open chat with Alti"]').should('be.visible');
  });

  it('should be visible on the contact page', () => {
    cy.visit('/contact');
    cy.get('button[aria-label="Open chat with Alti"]').should('be.visible');
  });

  it('should be visible on the blog page', () => {
    // Stub Sanity to prevent real API calls
    cy.intercept('GET', '**/k5950b3w**sanity.io/**', {
      statusCode: 200,
      body: { result: { posts: [], tags: [], series: [] } },
    });
    cy.visit('/blog');
    cy.get('button[aria-label="Open chat with Alti"]').should('be.visible');
  });

  it('should not be visible on the admin page', () => {
    cy.visit('/admin');
    cy.get('button[aria-label="Open chat with Alti"]').should('not.exist');
  });
});
