import { BACKEND_POST_URL } from '../support/endpoints';

/// <reference types="cypress" />

const EVT = '\x00EVT\x00';

function agenticResponseBody(text: string, events: Record<string, unknown>[]) {
  const encoded = events.map((e) => `${EVT}${JSON.stringify(e)}${EVT}`).join('');
  return `${text}${encoded}`;
}

describe('Alti agent — draft actions smoke test', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.sessionStorage.clear();
    });
  });

  it('renders a navigation draft card when the agent emits draft_action navigate', () => {
    cy.intercept('POST', BACKEND_POST_URL, {
      statusCode: 200,
      headers: { 'content-type': 'text/plain' },
      body: agenticResponseBody('Here is the podcast page.', [
        {
          kind: 'tool_invocation',
          tool: 'navigate_to',
          toolUseId: 't1',
        },
        {
          kind: 'draft_action',
          action: 'navigate',
          path: '/podcast',
          reason: 'Christian hosts The Vector Podcast.',
        },
        {
          kind: 'tool_result',
          tool: 'navigate_to',
          toolUseId: 't1',
          status: 'success',
        },
      ]),
    }).as('agenticChat');

    cy.visit('/chat');
    cy.get('textarea[aria-label="Type a message"]').type('take me to the podcast{enter}');
    cy.wait('@agenticChat');

    cy.contains('Here is the podcast page.', { timeout: 15000 }).should('be.visible');
    cy.contains('Suggested navigation').should('be.visible');
    cy.contains('/podcast').should('be.visible');
    cy.contains('button', 'Take me there').should('be.visible');
  });

  it('renders a contact draft card when the agent emits draft_action contact', () => {
    cy.intercept('POST', BACKEND_POST_URL, {
      statusCode: 200,
      headers: { 'content-type': 'text/plain' },
      body: agenticResponseBody("Here's a draft you can review.", [
        {
          kind: 'draft_action',
          action: 'contact',
          subject: 'Podcast appearance',
          body: 'I would like to invite Christian onto my show about veteran transitions.',
          intent: 'podcast',
        },
      ]),
    }).as('agenticContact');

    cy.visit('/chat');
    cy.get('textarea[aria-label="Type a message"]').type('can i get him on my podcast{enter}');
    cy.wait('@agenticContact');

    cy.contains('Podcast invitation').should('be.visible');
    cy.contains('Podcast appearance').should('be.visible');
    cy.contains('button', 'Review & send').should('be.visible');
  });

  it('shows the Forget me control on the chat page', () => {
    cy.intercept('POST', BACKEND_POST_URL, {
      statusCode: 200,
      headers: { 'content-type': 'text/plain' },
      body: 'Hello.',
    }).as('chatOk');

    cy.visit('/chat');
    cy.get('button[aria-label="Forget what I told Alti"]').should('be.visible');
  });
});
