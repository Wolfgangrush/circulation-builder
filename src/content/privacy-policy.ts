export type PrivacySection = {
  heading: string;
  paragraphs: string[];
};

export type PrivacyPolicy = {
  title: string;
  effectiveDate: string;
  appliesTo: string;
  sections: PrivacySection[];
};

// PRIVACY.md at the repository root carries the same text. `src/meta/release-meta.test.ts`
// fails if the two drift apart, so edit both together.
export const privacyPolicy: PrivacyPolicy = {
  title: "Privacy policy",
  effectiveDate: "6 October 2026",
  appliesTo: "Circulation Builder for Bombay High Court, version 0.1.0 and later, until this policy is replaced.",
  sections: [
    {
      heading: "The short version",
      paragraphs: [
        "Circulation Builder runs entirely on your own computer. It does not collect, transmit, sell or share anything you type into it. It has no accounts, no analytics, no advertising, no cookies and no telemetry.",
        "The publisher never receives your case details, party names, synopsis, advocate name or any other part of a slip. There is no server for that information to go to."
      ]
    },
    {
      heading: "Who publishes this application",
      paragraphs: [
        "Circulation Builder is published by Rushikesh R. Mahajan under the open-source name wolfgang_rush.",
        "It is an independent tool. It is not an official application of the Bombay High Court, and it is not affiliated with or endorsed by the High Court, its Registry or any Bar Association."
      ]
    },
    {
      heading: "What you enter, and where it goes",
      paragraphs: [
        "The details you type — the case reference, the circulation category, the names of parties, the date sought for listing, the synopsis, the advocate's name and the date of the slip — are held only in the application's working memory while its window is open.",
        "They are not written to a database, a settings file, browser storage or a log. When you press Reset, or quit the application, they are gone. The application cannot bring back a slip that you did not print or save."
      ]
    },
    {
      heading: "What is kept on your computer",
      paragraphs: [
        "The application does not save your slips. A slip leaves the application only when you print it or choose Save as PDF, and then it goes only to the printer or the file location you select. Printing is handled by your operating system and your printer in the usual way.",
        "Like other desktop applications built on the Electron framework, the desktop version keeps a small folder of technical housekeeping files, such as a display cache and window preferences, inside your user Library under Application Support. The application does not write the contents of your slips into that folder. You may delete the folder whenever the application is closed."
      ]
    },
    {
      heading: "Network use",
      paragraphs: [
        "The application works without an internet connection. The desktop version refuses every network request made from its own window, and loads only the files that are shipped inside it.",
        "The one exception is a link that you choose to click. The reference link to the official Bombay High Court website opens in your own web browser. Nothing you have typed is attached to that link. Once the page opens, your browser and that website work under their own terms."
      ]
    },
    {
      heading: "What your operating system and the download site may do",
      paragraphs: [
        "When you open a downloaded application for the first time, macOS may contact Apple to confirm that the application has been notarised and has not been revoked. That check is made by macOS, not by this application, and it does not include anything you type.",
        "If you download the application or its source code from GitHub, GitHub handles that download under its own privacy statement. The publisher can see only aggregate figures, such as a download count, and cannot tell who downloaded it.",
        "The publisher does not host a web version of this tool. If someone else hosts a copy of it as a website, that host's own practices apply to it."
      ]
    },
    {
      heading: "Client and matter information",
      paragraphs: [
        "A circulation slip can carry information about a client and a pending matter. Because the application keeps nothing and sends nothing, the confidentiality of that information stays in your hands. It depends on where you save the PDF, who can use your computer, and how you handle the printed slip.",
        "Please do not put the details of a real matter into a bug report or a public issue page."
      ]
    },
    {
      heading: "Changes to this policy",
      paragraphs: [
        "If a later version changes how the application handles information, for example by adding an optional feature that saves drafts, this policy will be updated in the same release and the change will be described in the release notes. The policy that ships inside a version of the application is the one that applies to that version."
      ]
    },
    {
      heading: "Questions",
      paragraphs: [
        "Questions about this policy can be raised through the project's public repository, or by email to wolfgangrush@gmail.com."
      ]
    }
  ]
};
