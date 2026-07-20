import { describe, it, expect } from 'vitest';
import { CREDENTIALS } from './credentials';

describe('CREDENTIALS data source', () => {
  it('is non-empty', () => {
    expect(CREDENTIALS.length).toBeGreaterThan(0);
  });

  it('lists the Bronze Star award', () => {
    const bronzeStar = CREDENTIALS.find((c) => c.id === 'bronze-star');
    expect(bronzeStar).toBeDefined();
    expect(bronzeStar?.field).toBe('award');
    expect(bronzeStar?.label).toBe('Bronze Star Medal');
  });

  it('lists the Green Beret / 18D military qualifications', () => {
    const greenBeret = CREDENTIALS.find((c) => c.id === 'green-beret');
    const medic = CREDENTIALS.find((c) => c.id === 'special-forces-medic-18d');
    expect(greenBeret).toBeDefined();
    expect(medic).toBeDefined();
    expect(greenBeret?.field).toBe('hasCredential');
    expect(medic?.field).toBe('hasCredential');
  });

  it('lists the AWS Community Builder membership', () => {
    const aws = CREDENTIALS.find((c) => c.id === 'aws-community-builder');
    expect(aws).toBeDefined();
    expect(aws?.field).toBe('memberOf');
    expect(aws?.label).toBe('AWS Community Builder');
  });

  it('lists Anthropic Academy certifications', () => {
    const anthropic = CREDENTIALS.find((c) => c.id === 'anthropic-academy');
    expect(anthropic).toBeDefined();
    expect(anthropic?.field).toBe('hasCredential');
    expect(anthropic?.label).toMatch(/Anthropic Academy/);
  });

  it('lists Veteran Business of the Month with a reference URL', () => {
    const vbm = CREDENTIALS.find((c) => c.id === 'veteran-business-of-the-month');
    expect(vbm).toBeDefined();
    expect(vbm?.field).toBe('organizationAward');
    expect(vbm?.url).toMatch(/^https?:\/\//);
  });

  it('has stable, unique ids for every entry', () => {
    const ids = CREDENTIALS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a label, category, and description', () => {
    CREDENTIALS.forEach((c) => {
      expect(c.label).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(c.description).toBeTruthy();
    });
  });
});
