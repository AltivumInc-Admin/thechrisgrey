import { BACKEND_POST_URL } from '../support/endpoints';

describe('Alti Chat Page', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test to start fresh
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });

    cy.stubChatEndpoint();
    cy.visit('/chat');
  });

  it('should load the chat page successfully', () => {
    cy.url().should('include', '/chat');
  });

  it('should display the page heading', () => {
    cy.contains('h1', 'Alti').should('be.visible');
  });

  it('should display the subheading with instructions', () => {
    cy.contains('Ask me anything about Christian, Altivum, the podcast, or his book.').should('be.visible');
  });

  it('should have correct SEO meta tags', () => {
    cy.verifySEO('Alti');
  });

  it('should display the welcome message from the assistant', () => {
    cy.get('[role="log"]').within(() => {
      cy.contains("Altivum's official AI Agent").should('be.visible');
    });
  });

  // /chat no longer falls back to the generic DEFAULT_SUGGESTIONS; it renders the
  // tool-powered starter chips declared for the route. Source of truth for this
  // copy is the `suggestions` array on the '/chat' entry in src/routes.ts.
  it('should display suggested prompts when no user messages exist', () => {
    cy.contains("Compare Christian's military and tech careers").should('be.visible');
    cy.contains('Search the blog for posts on AI strategy').should('be.visible');
    cy.contains('Draft a speaking inquiry for an upcoming event').should('be.visible');
  });

  it('should display the chat input field', () => {
    cy.get('textarea[aria-label="Type a message"]').should('be.visible');
    cy.get('textarea[aria-label="Type a message"]').should('have.attr', 'placeholder', 'Ask me anything...');
  });

  it('should display a disabled send button when input is empty', () => {
    cy.get('button[aria-label="Send message"]').should('be.disabled');
  });

  it('should enable the send button when text is entered', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Hello');
    cy.get('button[aria-label="Send message"]').should('not.be.disabled');
  });

  it('should send a message and display the user message', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Who is Christian Perez?');
    cy.get('button[aria-label="Send message"]').click();

    // User message should appear
    cy.get('[role="log"]').within(() => {
      cy.contains('Who is Christian Perez?').should('be.visible');
    });
  });

  it('should receive and display an assistant response after sending a message', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Who is Christian Perez?');
    cy.get('button[aria-label="Send message"]').click();

    // Should show the mock response
    cy.get('[role="log"]').within(() => {
      cy.contains('Founder and CEO of Altivum Inc', { timeout: 15000 }).should('be.visible');
    });
  });

  it('should clear the input after sending a message', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Who is Christian Perez?');
    cy.get('button[aria-label="Send message"]').click();

    cy.get('textarea[aria-label="Type a message"]').should('have.value', '');
  });

  it('should hide suggested prompts after the first user message', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Hello');
    cy.get('button[aria-label="Send message"]').click();

    cy.contains("Compare Christian's military and tech careers").should('not.exist');
  });

  it('should send a message when clicking a suggested prompt', () => {
    cy.contains("Compare Christian's military and tech careers").click();

    // The suggestion text should appear as a user message
    cy.get('[role="log"]').within(() => {
      cy.contains("Compare Christian's military and tech careers").should('be.visible');
    });
  });

  it('should send a message with Enter key', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Hello{enter}');

    cy.get('[role="log"]').within(() => {
      cy.contains('Hello').should('be.visible');
    });
  });

  it('should not send a message with Shift+Enter (new line)', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Hello{shift+enter}World');

    // Message should not have been sent -- text should still be in the input
    cy.get('textarea[aria-label="Type a message"]').should('contain.value', 'Hello');
  });

  it('should show the Clear button after sending a message', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Hello');
    cy.get('button[aria-label="Send message"]').click();

    cy.get('button[aria-label="Clear conversation"]').should('be.visible');
  });

  it('should clear the conversation when clicking Clear', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Hello');
    cy.get('button[aria-label="Send message"]').click();

    // Wait for response
    cy.get('[role="log"]').within(() => {
      cy.contains('Founder and CEO', { timeout: 15000 }).should('exist');
    });

    cy.get('button[aria-label="Clear conversation"]').click();

    // Should reset to the welcome message only
    cy.get('[role="log"]').within(() => {
      cy.contains("Altivum's official AI Agent").should('be.visible');
      cy.contains('Hello').should('not.exist');
    });
  });

  it('should display the character count when typing', () => {
    cy.get('textarea[aria-label="Type a message"]').type('Hello world');
    cy.contains('11/4,000').should('be.visible');
  });

  it('should not display the chat widget FAB on the chat page', () => {
    cy.get('button[aria-label="Open chat with Alti"]').should('not.exist');
  });

  it('should not display the footer on the chat page', () => {
    cy.get('footer').should('not.exist');
  });

  it('should display the navigation bar', () => {
    cy.verifyNavigation();
  });

  it('should have aria-live region for screen readers', () => {
    cy.get('[aria-live="polite"]').should('exist');
    cy.get('[role="log"]').should('exist');
  });

  it('should be responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.contains('h1', 'Alti').should('be.visible');
    cy.get('textarea[aria-label="Type a message"]').should('be.visible');
  });
});

describe('Alti Chat Page - Error Handling', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });
  });

  it('should show an error message when the chat API returns an error', () => {
    // Use the exact same pattern that successfully intercepts in stubChatEndpoint
    cy.intercept('POST', BACKEND_POST_URL, {
      statusCode: 500,
      body: 'Internal Server Error',
    }).as('chatError');

    cy.visit('/chat');
    cy.get('textarea[aria-label="Type a message"]').type('Hello{enter}');

    cy.wait('@chatError');

    cy.get('[role="log"]').within(() => {
      cy.contains(/error|try again/i, { timeout: 15000 }).should('be.visible');
    });
  });
});
