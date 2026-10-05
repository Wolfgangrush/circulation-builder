import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { caseTypes, catalogue } from "../data/case-types";
import { circulationCategories } from "../data/circulation-categories";
import type { CaseType, CourtSide, IdentifierRoute, SlipDraft, ValidationIssue } from "../domain/types";
import { blockingIssues, createEmptyDraft, resetDraft, suggestCaseReference, validateDraft } from "../domain/validation";
import { APP_TITLE, APP_VERSION, COPYRIGHT_NOTICE, LICENCE_NAME, OPEN_PRIVACY_EVENT, UNOFFICIAL_NOTICE } from "../content/app-meta";
import { privacyPolicy } from "../content/privacy-policy";

const today = new Date().toISOString().slice(0, 10);

function formatDate(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(year, month - 1, day));
}

function routeLabel(route: IdentifierRoute): string {
  return route === "registered" ? "Registered case" : route === "stamp_lodging" ? "Stamp / lodging case" : "e-Filing reference";
}

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  if (!issues.length) return null;
  return (
    <section className="issue-list" aria-live="polite" aria-label="Form checks">
      <strong>Before printing</strong>
      <ul>
        {issues.map((issue, index) => <li className={issue.severity} key={`${issue.field}-${issue.code}-${index}`}>{issue.message}</li>)}
      </ul>
    </section>
  );
}

function CaseTypeSearch({
  side,
  selected,
  onSelect
}: {
  side: CourtSide;
  selected?: CaseType;
  onSelect: (caseType?: CaseType) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const options = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return caseTypes
      .filter((item) => item.sides.includes(side))
      .filter((item) => !needle || `${item.code} ${item.label}`.toLocaleLowerCase().includes(needle))
      .slice(0, 60);
  }, [query, side]);

  const selectOption = (caseType: CaseType) => {
    onSelect(caseType);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  };

  const moveActiveOption = (direction: 1 | -1) => {
    if (!options.length) return;
    setActiveIndex((current) => {
      if (current < 0) return direction === 1 ? 0 : options.length - 1;
      return (current + direction + options.length) % options.length;
    });
  };

  return (
    <div className="case-type-search">
      <label htmlFor="case-type-search">Court case type</label>
      <input
        id="case-type-search"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="case-type-options"
        aria-activedescendant={open && activeIndex >= 0 ? `case-type-option-${options[activeIndex]?.id}` : undefined}
        value={open ? query : selected ? `${selected.code} — ${selected.label}` : query}
        onFocus={() => { setOpen(true); setQuery(selected ? "" : query); setActiveIndex(-1); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(-1); onSelect(undefined); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            moveActiveOption(1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            moveActiveOption(-1);
          } else if (event.key === "Enter" && open && activeIndex >= 0 && options[activeIndex]) {
            event.preventDefault();
            selectOption(options[activeIndex]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
        placeholder="Search code or type name"
        autoComplete="off"
      />
      {open && (
        <div className="case-type-options" id="case-type-options" role="listbox">
          {options.length ? options.map((item, index) => (
            <button
              type="button"
              role="option"
              aria-selected={selected?.id === item.id}
              id={`case-type-option-${item.id}`}
              className={activeIndex === index ? "active" : ""}
              key={item.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(item)}
            >
              <b>{item.code}</b><span>{item.label}</span>
            </button>
          )) : <p>No matching type in this local catalogue.</p>}
        </div>
      )}
      <p className="field-note">{side === "AS" ? "Appellate Side" : "Original Side"} · catalogue checked {catalogue.checkedOn} · <a href={catalogue.sourceUrl} target="_blank" rel="noreferrer">source</a></p>
    </div>
  );
}

function SlipPreview({
  draft,
  paperRef,
  synopsisOverflowRef
}: {
  draft: SlipDraft;
  paperRef: RefObject<HTMLElement | null>;
  synopsisOverflowRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <article className="paper" aria-label="Circulation slip preview" ref={paperRef}>
      {draft.freshMatter && <div className="fresh-matter-flag">FRESH MATTER</div>}
      <h2>CIRCULATION SLIP</h2>
      <div className="address">To,<br /><span>THE REGISTRAR (JUDL.)</span><br /><span>HIGH COURT OF BOMBAY,</span><br /><span>BENCH AT NAGPUR.</span></div>
      <dl className="slip-fields">
        <div><dt>01) <span>CASE NUMBER</span></dt><dd>{draft.caseIdentity.displayReference}</dd></div>
        <div><dt>02) <span>CATEGORY</span></dt><dd>{draft.circulationCategory}</dd></div>
        <div><dt>03) <span>NAME OF PARTIES</span></dt><dd>{draft.parties}</dd></div>
        <div><dt>04) <span>THE DATE SOUGHT FOR<br />LISTING OF MATTER</span></dt><dd>{formatDate(draft.listingDate)}</dd></div>
        <div className="synopsis-row"><dt>05) <span>SYNOPSIS OF MATTER<br /><small>(In Short)</small></span></dt><dd ref={synopsisOverflowRef} className="synopsis-output">{draft.synopsis}</dd></div>
      </dl>
      <div className="advocate-line">NAME OF ADVOCATE: <strong>{draft.advocateName}</strong></div>
      <div className="signature-row"><span>DATE: <strong>{formatDate(draft.slipDate)}</strong></span><span>SIGNATURE OF ADVOCATE</span></div>
      <section className="categories-print">
        <h3>:CATEGORIES:</h3>
        <p>{circulationCategories.map((category, index) => `${index + 1}) ${category}`).join(", ")}</p>
      </section>
    </article>
  );
}

function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="privacy-backdrop no-print" onClick={onClose}>
      <div
        className="privacy-dialog no-print"
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="privacy-title">{privacyPolicy.title}</h2>
        <p className="field-note">Effective {privacyPolicy.effectiveDate}. {privacyPolicy.appliesTo}</p>
        {privacyPolicy.sections.map((section) => (
          <section key={section.heading}>
            <h3>{section.heading}</h3>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </section>
        ))}
        <button type="button" ref={closeButtonRef} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function App() {
  const [draft, setDraft] = useState<SlipDraft>(() => createEmptyDraft({ slipDate: today }));
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [synopsisOverflow, setSynopsisOverflow] = useState(false);
  const [paperOverflow, setPaperOverflow] = useState(false);
  const paperRef = useRef<HTMLElement>(null);
  const synopsisRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenPrivacy = () => {
      setPrivacyOpen(true);
    };
    window.addEventListener(OPEN_PRIVACY_EVENT, handleOpenPrivacy);
    return () => window.removeEventListener(OPEN_PRIVACY_EVENT, handleOpenPrivacy);
  }, []);

  useLayoutEffect(() => {
    const element = synopsisRef.current;
    setSynopsisOverflow(Boolean(element && element.scrollHeight > element.clientHeight + 1));
  }, [draft.synopsis]);

  useLayoutEffect(() => {
    const element = paperRef.current;
    const a4HeightInCssPixels = (297 / 25.4) * 96;
    setPaperOverflow(Boolean(element && element.getBoundingClientRect().height > a4HeightInCssPixels + 2));
  }, [draft]);

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const issues = useMemo(() => [
    ...validation,
    ...(synopsisOverflow ? [{ field: "synopsis" as const, code: "synopsis_overflow", message: "Synopsis does not fit the A4 preview. Shorten it before printing.", severity: "blocking" as const }] : []),
    ...(paperOverflow ? [{ field: "parties" as const, code: "a4_overflow", message: "The completed slip does not fit one A4 page. Shorten the entered text before printing.", severity: "blocking" as const }] : [])
  ], [paperOverflow, synopsisOverflow, validation]);
  const blockers = blockingIssues(issues);

  const updateIdentity = (patch: Partial<SlipDraft["caseIdentity"]>) => {
    setDraft((current) => {
      const identity = { ...current.caseIdentity, ...patch };
      if (patch.displayReference !== undefined && patch.displayConfirmed === undefined) {
        identity.displayConfirmed = false;
      }
      return { ...current, caseIdentity: identity };
    });
  };

  const changeRoute = (route: IdentifierRoute) => {
    setDraft((current) => ({
      ...current,
      caseIdentity: {
        route,
        side: route === "efiling" ? undefined : "AS",
        caseType: undefined,
        number: "",
        year: "",
        efilingNumber: "",
        manualReference: false,
        referenceOverride: false,
        displayReference: "",
        displayConfirmed: false,
        efilingAcknowledged: false
      }
    }));
  };

  const chooseType = (caseType?: CaseType) => {
    updateIdentity({
      caseType,
      manualReference: false,
      referenceOverride: false,
      displayReference: suggestCaseReference(caseType, currentIdentity.route, currentIdentity.number ?? "", currentIdentity.year ?? "")
    });
  };

  const updateStructuredIdentity = (patch: Partial<SlipDraft["caseIdentity"]>) => {
    const nextIdentity = { ...currentIdentity, ...patch };
    const suggestion = nextIdentity.manualReference || nextIdentity.referenceOverride
      ? currentIdentity.displayReference
      : suggestCaseReference(nextIdentity.caseType, nextIdentity.route, nextIdentity.number ?? "", nextIdentity.year ?? "");
    updateIdentity({ ...patch, displayReference: suggestion });
  };

  const populateEfilingReference = (efilingNumber: string) => {
    updateIdentity({
      efilingNumber,
      displayReference: efilingNumber ? `e-Filing No. ${efilingNumber}` : ""
    });
  };

  const currentIdentity = draft.caseIdentity;
  const generatedStructuredReference = Boolean(currentIdentity.caseType && !currentIdentity.manualReference && !currentIdentity.referenceOverride);
  const generatedReference = currentIdentity.route === "efiling" || generatedStructuredReference;

  return (
    <main>
      <header className="site-header">
        <p className="eyebrow">BOMBAY HIGH COURT · NAGPUR BENCH</p>
        <h1>Circulation Builder</h1>
        <p>Prepare a circulation slip locally. This tool formats your entered facts; it does not file or verify a matter.</p>
      </header>

      <div className="app-shell">
        <form className="builder-form" onSubmit={(event) => event.preventDefault()}>
          <section className="form-card">
            <div className="section-heading"><span>1</span><div><h2>Case identity</h2><p>Select the reference you will place on the slip.</p></div></div>
            <div className="route-tabs" role="radiogroup" aria-label="Case identity route">
              {(["registered", "stamp_lodging", "efiling"] as const).map((route) => (
                <label key={route} className={currentIdentity.route === route ? "active" : ""}>
                  <input type="radio" checked={currentIdentity.route === route} onChange={() => changeRoute(route)} />
                  {routeLabel(route)}
                </label>
              ))}
            </div>

            {currentIdentity.route !== "efiling" ? <>
              <div className="side-tabs" role="radiogroup" aria-label="Court side">
                <label><input type="radio" checked={currentIdentity.side === "AS"} onChange={() => updateStructuredIdentity({ side: "AS", caseType: undefined })} />Appellate Side</label>
                <label><input type="radio" checked={currentIdentity.side === "OS"} onChange={() => updateStructuredIdentity({ side: "OS", caseType: undefined })} />Original Side</label>
              </div>
              {!currentIdentity.manualReference && <CaseTypeSearch side={currentIdentity.side ?? "AS"} selected={currentIdentity.caseType} onSelect={chooseType} />}
              <label className="checkbox-row"><input type="checkbox" checked={Boolean(currentIdentity.manualReference)} onChange={(event) => updateIdentity({ manualReference: event.target.checked, caseType: undefined, referenceOverride: false, displayReference: "" })} /> Type missing from catalogue — I will enter the exact case reference.</label>
              {currentIdentity.manualReference && <p className="warning-inline">Catalogue update needed. This does not create or validate an official case type.</p>}
              <div className="inline-fields">
                <label>Number<input inputMode="numeric" value={currentIdentity.number ?? ""} onChange={(event) => updateStructuredIdentity({ number: event.target.value })} placeholder="Number" /></label>
                <label>Year<input inputMode="numeric" value={currentIdentity.year ?? ""} onChange={(event) => updateStructuredIdentity({ year: event.target.value })} placeholder="YYYY" maxLength={4} /></label>
              </div>
            </> : <>
              <label>e-Filing number<input value={currentIdentity.efilingNumber ?? ""} onChange={(event) => populateEfilingReference(event.target.value)} placeholder="AMH20200000000C202600001" autoCapitalize="characters" /></label>
              <label className="checkbox-row warn"><input type="checkbox" checked={currentIdentity.efilingAcknowledged} onChange={(event) => updateIdentity({ efilingAcknowledged: event.target.checked })} /> I understand this reference does not itself prove registration, acceptance, grant, or listing.</label>
            </>}

            <label>{generatedReference ? "Generated case reference" : "Case reference exactly as it should print"}<input value={currentIdentity.displayReference} readOnly={generatedReference} onChange={(event) => updateIdentity({ displayReference: event.target.value, referenceOverride: true })} placeholder="Select a type, number, and year — or enter from your case record" /></label>
            {generatedStructuredReference && <p className="field-note">Generated automatically from the selected type, number, and year. <button type="button" className="text-button" onClick={() => updateIdentity({ referenceOverride: true })}>Edit this reference</button> only if a correction is needed.</p>}
            <label className="checkbox-row"><input type="checkbox" checked={currentIdentity.displayConfirmed} onChange={(event) => updateIdentity({ displayConfirmed: event.target.checked })} /> I have checked this exact printed reference against my case record.</label>
          </section>

          <section className="form-card">
            <div className="section-heading"><span>2</span><div><h2>Circulation request</h2><p>The court case type and this category are separate choices.</p></div></div>
            <label>Circulation category<select value={draft.circulationCategory} onChange={(event) => setDraft({ ...draft, circulationCategory: event.target.value })}><option value="">Select one of the {circulationCategories.length} categories</option>{circulationCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label className="checkbox-row fresh-matter-choice"><input type="checkbox" checked={draft.freshMatter} onChange={(event) => setDraft({ ...draft, freshMatter: event.target.checked })} /> Mark as <strong>FRESH MATTER</strong> at the top-right of the circulation slip.</label>
            <label>Name of parties<input value={draft.parties} onChange={(event) => setDraft({ ...draft, parties: event.target.value })} placeholder="Exact cause title" /></label>
            <label>Date sought for listing<input type="date" value={draft.listingDate} onChange={(event) => setDraft({ ...draft, listingDate: event.target.value })} /></label>
            <label className="synopsis-input">Synopsis of matter <small>(In Short)</small><textarea value={draft.synopsis} onChange={(event) => setDraft({ ...draft, synopsis: event.target.value })} placeholder="What is before the Court now? What needs consideration? Why is listing sought on this date?" rows={7} /></label>
            <p className="field-note">Your words print as entered. The app does not draft or rewrite the synopsis.</p>
          </section>

          <section className="form-card">
            <div className="section-heading"><span>3</span><div><h2>Advocate details</h2><p>Leave signature for physical signing after print.</p></div></div>
            <label>Name of advocate<input value={draft.advocateName} onChange={(event) => setDraft({ ...draft, advocateName: event.target.value })} /></label>
            <label>Date of slip<input type="date" value={draft.slipDate} onChange={(event) => setDraft({ ...draft, slipDate: event.target.value })} /></label>
          </section>

          <IssueList issues={issues} />
          <div className="actions no-print">
            <button type="button" className="secondary" onClick={() => setDraft(resetDraft(draft))}>Reset</button>
            <button type="button" disabled={Boolean(blockers.length)} onClick={() => window.print()}>Print / Save as PDF</button>
          </div>
        </form>

        <aside className="preview-wrap">
          <div className="preview-label no-print"><span>Live A4 preview</span><span>{blockers.length ? `${blockers.length} item${blockers.length === 1 ? "" : "s"} to fix` : "Ready to print"}</span></div>
          <SlipPreview draft={draft} paperRef={paperRef} synopsisOverflowRef={synopsisRef} />
        </aside>
      </div>

      <footer className="app-footer no-print" aria-label="About this application">
        <p><strong>{APP_TITLE}</strong> · Version {APP_VERSION}</p>
        <p>{UNOFFICIAL_NOTICE}</p>
        <p>{COPYRIGHT_NOTICE} · {LICENCE_NAME} · <button type="button" className="text-button" onClick={() => setPrivacyOpen(true)}>Privacy policy</button></p>
      </footer>

      {privacyOpen && <PrivacyDialog onClose={() => setPrivacyOpen(false)} />}
    </main>
  );
}
