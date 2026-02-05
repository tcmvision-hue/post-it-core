export default function FrontPage({ onContinue }) {
  return (
    <div className="frontpage">
      <h1>Welkom bij POST IT.</h1>

      <p>
        POST IT is een dagelijkse post die meebeweegt met wat er vandaag speelt.
        Niet om iets van u te vragen, maar om iets zichtbaar te maken.
      </p>

      <p>
        <strong>POST IT heeft altijd een post voor u.</strong><br />
        De vorm kan verschillen, maar er is altijd iets dat vandaag past.
      </p>

      <p>POST IT kan verschillende vormen aannemen.</p>

      <p>
        Soms is het logisch en zakelijk.<br />
        Soms persoonlijk en reflectief.<br />
        Soms richtinggevend, zonder advies te geven.
      </p>

      <p>
        Geen van deze vormen is beter dan de andere.
        Ze sluiten aan op wat er vandaag nodig is.
      </p>

      <p>
        De toon van de post wordt bepaald in de intake.
        Wat u daar deelt, zet de toon voor de post van vandaag.
      </p>

      <p>
        U hoeft niets te kiezen.
        De intake helpt alleen om te begrijpen wat passend is.
      </p>

      <button onClick={onContinue}>
        Verder
      </button>
    </div>
  );
}
