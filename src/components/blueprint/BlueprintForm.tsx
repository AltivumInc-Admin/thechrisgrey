import { useState, type FormEvent } from 'react';
import { typography } from '../../utils/typography';
import { Button } from '../ui/Button';
import {
  BLUEPRINT_CATEGORIES,
  CATEGORY_LABELS,
  COMPLIANCE_REGIMES,
  PREFERRED_LANGUAGES,
  type BlueprintCategory,
  type BlueprintInput,
  type ComplianceRegime,
  type PreferredLanguage,
} from '../../types/blueprint';
import Icon from '../icons/Icon';

interface BlueprintFormProps {
  onSubmit: (input: BlueprintInput) => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const MIN_GOAL_LENGTH = 20;
const MAX_GOAL_LENGTH = 500;

type CompactSet<T> = Set<T>;

function toggleIn<T>(set: CompactSet<T>, value: T): CompactSet<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function BlueprintForm({ onSubmit, isGenerating, disabled }: BlueprintFormProps) {
  const [goal, setGoal] = useState('');
  const [category, setCategory] = useState<BlueprintCategory>('web-api');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [traffic, setTraffic] = useState('');
  const [dataVolume, setDataVolume] = useState('');
  const [latencyBudget, setLatencyBudget] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState<string>('');
  const [compliance, setCompliance] = useState<CompactSet<ComplianceRegime>>(new Set());
  const [languages, setLanguages] = useState<CompactSet<PreferredLanguage>>(new Set());
  const [integrations, setIntegrations] = useState('');

  const trimmedGoal = goal.trim();
  const goalTooShort = trimmedGoal.length > 0 && trimmedGoal.length < MIN_GOAL_LENGTH;
  const goalTooLong = trimmedGoal.length > MAX_GOAL_LENGTH;
  const canSubmit =
    !disabled && !isGenerating && trimmedGoal.length >= MIN_GOAL_LENGTH && trimmedGoal.length <= MAX_GOAL_LENGTH;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    const budget = monthlyBudget.trim() ? Number.parseInt(monthlyBudget, 10) : undefined;
    const integrationsList = integrations
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);

    const input: BlueprintInput = {
      goal: trimmedGoal,
      category,
    };

    const scale: NonNullable<BlueprintInput['scale']> = {};
    if (traffic.trim()) scale.traffic = traffic.trim();
    if (dataVolume.trim()) scale.data_volume = dataVolume.trim();
    if (latencyBudget.trim()) scale.latency_budget = latencyBudget.trim();
    if (Object.keys(scale).length > 0) input.scale = scale;

    const constraints: NonNullable<BlueprintInput['constraints']> = {};
    if (typeof budget === 'number' && Number.isFinite(budget) && budget > 0) {
      constraints.monthly_budget_usd = budget;
    }
    if (compliance.size > 0) constraints.compliance = Array.from(compliance);
    if (Object.keys(constraints).length > 0) input.constraints = constraints;

    if (languages.size > 0) input.preferred_languages = Array.from(languages);
    if (integrationsList.length > 0) input.integrations = integrationsList;

    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label="Blueprint spec form">
      <div>
        <label htmlFor="blueprint-goal" className="block mb-2 text-altivum-silver" style={typography.smallText}>
          What are you building?
        </label>
        <textarea
          id="blueprint-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="A serverless RAG chat for my personal docs under $30/month"
          rows={4}
          minLength={MIN_GOAL_LENGTH}
          maxLength={MAX_GOAL_LENGTH}
          required
          disabled={isGenerating || disabled}
          className="w-full px-4 py-3 bg-altivum-navy border border-white/10 rounded-md text-white placeholder:text-altivum-silver/60 focus:outline-hidden focus:border-altivum-gold/50 focus:ring-1 focus:ring-altivum-gold/30 transition-colors disabled:opacity-60"
          aria-describedby="goal-help"
        />
        <div id="goal-help" className="mt-1 flex justify-between text-altivum-silver/70" style={typography.smallText}>
          <span>
            {goalTooShort && `At least ${MIN_GOAL_LENGTH} characters`}
            {goalTooLong && `No more than ${MAX_GOAL_LENGTH} characters`}
            {!goalTooShort && !goalTooLong && 'Describe the workload in your own words.'}
          </span>
          <span>
            {trimmedGoal.length}/{MAX_GOAL_LENGTH}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="blueprint-category" className="block mb-2 text-altivum-silver" style={typography.smallText}>
          Workload type
        </label>
        <select
          id="blueprint-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as BlueprintCategory)}
          disabled={isGenerating || disabled}
          className="w-full px-4 py-3 bg-altivum-navy border border-white/10 rounded-md text-white focus:outline-hidden focus:border-altivum-gold/50 focus:ring-1 focus:ring-altivum-gold/30 transition-colors disabled:opacity-60"
        >
          {BLUEPRINT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center text-altivum-gold hover:text-altivum-gold/80 transition-colors"
          style={typography.smallText}
          aria-expanded={showAdvanced}
          aria-controls="advanced-fields"
        >
          <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} className="text-sm mr-1" aria-hidden="true" />
          {showAdvanced ? 'Hide' : 'Show'} optional details
        </button>
      </div>

      {showAdvanced && (
        <div id="advanced-fields" className="space-y-6 p-5 rounded-lg bg-altivum-navy/50 border border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="traffic" className="block mb-2 text-altivum-silver" style={typography.smallText}>
                Traffic
              </label>
              <input
                id="traffic"
                type="text"
                value={traffic}
                onChange={(e) => setTraffic(e.target.value)}
                placeholder="1k req/day"
                maxLength={200}
                disabled={isGenerating || disabled}
                className="w-full px-3 py-2 bg-altivum-dark border border-white/10 rounded-md text-white placeholder:text-altivum-silver/50 focus:outline-hidden focus:border-altivum-gold/50 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="data-volume" className="block mb-2 text-altivum-silver" style={typography.smallText}>
                Data volume
              </label>
              <input
                id="data-volume"
                type="text"
                value={dataVolume}
                onChange={(e) => setDataVolume(e.target.value)}
                placeholder="500MB of markdown"
                maxLength={200}
                disabled={isGenerating || disabled}
                className="w-full px-3 py-2 bg-altivum-dark border border-white/10 rounded-md text-white placeholder:text-altivum-silver/50 focus:outline-hidden focus:border-altivum-gold/50 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="latency" className="block mb-2 text-altivum-silver" style={typography.smallText}>
                Latency budget
              </label>
              <input
                id="latency"
                type="text"
                value={latencyBudget}
                onChange={(e) => setLatencyBudget(e.target.value)}
                placeholder="first token < 2s"
                maxLength={200}
                disabled={isGenerating || disabled}
                className="w-full px-3 py-2 bg-altivum-dark border border-white/10 rounded-md text-white placeholder:text-altivum-silver/50 focus:outline-hidden focus:border-altivum-gold/50 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="budget" className="block mb-2 text-altivum-silver" style={typography.smallText}>
                Monthly budget (USD)
              </label>
              <input
                id="budget"
                type="number"
                min="1"
                max="100000"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="30"
                disabled={isGenerating || disabled}
                className="w-full px-3 py-2 bg-altivum-dark border border-white/10 rounded-md text-white placeholder:text-altivum-silver/50 focus:outline-hidden focus:border-altivum-gold/50 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="integrations" className="block mb-2 text-altivum-silver" style={typography.smallText}>
                Integrations (comma-separated)
              </label>
              <input
                id="integrations"
                type="text"
                value={integrations}
                onChange={(e) => setIntegrations(e.target.value)}
                placeholder="Stripe, Salesforce"
                disabled={isGenerating || disabled}
                className="w-full px-3 py-2 bg-altivum-dark border border-white/10 rounded-md text-white placeholder:text-altivum-silver/50 focus:outline-hidden focus:border-altivum-gold/50 transition-colors"
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-altivum-silver" style={typography.smallText}>
              Compliance
            </legend>
            <div className="flex flex-wrap gap-2">
              {COMPLIANCE_REGIMES.map((regime) => {
                const checked = compliance.has(regime);
                return (
                  <button
                    key={regime}
                    type="button"
                    onClick={() => setCompliance((prev) => toggleIn(prev, regime))}
                    disabled={isGenerating || disabled}
                    aria-pressed={checked}
                    className={`px-3 py-1 rounded-full border transition-colors ${
                      checked
                        ? 'border-altivum-gold bg-altivum-gold/10 text-altivum-gold'
                        : 'border-white/10 text-altivum-silver hover:border-altivum-gold/40'
                    }`}
                    style={typography.smallText}
                  >
                    {regime.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-altivum-silver" style={typography.smallText}>
              Preferred languages
            </legend>
            <div className="flex flex-wrap gap-2">
              {PREFERRED_LANGUAGES.map((lang) => {
                const checked = languages.has(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguages((prev) => toggleIn(prev, lang))}
                    disabled={isGenerating || disabled}
                    aria-pressed={checked}
                    className={`px-3 py-1 rounded-full border transition-colors ${
                      checked
                        ? 'border-altivum-gold bg-altivum-gold/10 text-altivum-gold'
                        : 'border-white/10 text-altivum-silver hover:border-altivum-gold/40'
                    }`}
                    style={typography.smallText}
                  >
                    {lang}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      <div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          icon={isGenerating ? 'autorenew' : 'auto_awesome'}
          iconPosition="left"
        >
          {isGenerating ? 'Generating…' : 'Generate blueprint'}
        </Button>
      </div>
    </form>
  );
}

export default BlueprintForm;
