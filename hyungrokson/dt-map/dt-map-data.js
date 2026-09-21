/**
 * DT MAP — PLAYING FIELD — Data
 * Every node on the map lives here as a plain object. dt-map.js only
 * reads this file — it never hardcodes a name, relationship, or piece
 * of copy. To add or edit content:
 *
 *   1. Add/edit an object in NODES below. Required shape:
 *        { id, category, type, name, role, location,
 *          representativeWork, recentContribution, description,
 *          personalConnection, image, sourceUrl, relatedIds, status }
 *      Optional extras used by this map: `group` (People subgroup),
 *      `keywords` (short line shown on the card face), `notes`
 *      (array of { label, text } shown as extra blocks in the detail
 *      panel), `sourceStatus` ("verified" | "to-be-added" |
 *      "reflection" — see below), `imagePlaceholderText` (custom
 *      wording for the detail panel's placeholder when `image` hasn't
 *      landed yet — defaults to "Image forthcoming").
 *   2. `status` must be "complete", "draft", or "planned". Planned
 *      nodes render as intentionally empty archival slots and never
 *      throw even with most fields blank.
 *   3. `image` is the *expected* file path whether or not the file
 *      exists yet — drop the real image at that path later and it
 *      just starts working. Until then dt-map.js shows a designed
 *      placeholder, never a broken-image icon.
 *   4. `sourceUrl` — never invent one. Leave it null and set
 *      `sourceStatus` to "to-be-added" (a real source is owed but
 *      not found yet) or "reflection" (this is Roy's own opinion/
 *      experience and doesn't need external verification).
 *   5. `relatedIds` only needs to be listed on ONE side of a pair —
 *      dt-map.js symmetrizes every link when it loads, so add the
 *      id in whichever node it's more natural to write it on.
 *
 * Every category below is required to exist even while mostly empty
 * (see CATEGORIES) — that emptiness is the point: this is a living
 * document, not a finished deliverable.
 */
(function () {
  var CATEGORIES = [
    { id: "core", label: "Core", filterable: false },
    { id: "people", label: "People / Creative References" },
    { id: "projects", label: "Inspiring Projects" },
    { id: "new-tech", label: "New Technologies & Skills" },
    { id: "existing-skills", label: "Existing Skills to Improve" },
    { id: "personal-interests", label: "Personal Interests Outside DT" },
    { id: "concepts", label: "Concepts & Problems" },
    { id: "definition", label: "Definition of Creative Technology" },
  ];

  // People subgroups — used for both the desktop cluster layout and
  // the mobile vertical archive's section headers.
  var GROUPS = [
    { id: "sound", label: "Sound" },
    { id: "fashion", label: "Fashion" },
    { id: "art", label: "Art, Design & Creative Practice" },
  ];

  var NODES = [
    // ============================================================
    // CORE — the map's center. Always visible, never filtered out.
    // ============================================================
    {
      id: "core",
      category: "core",
      type: "Hub",
      name: "ROY SON / VELFONT OFFICE / FUTURE PRACTICE",
      role: "Center of the map",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "The fixed point every other node on this map is drawn in relation to — where Roy Son's creative practice, Velfont Office, and whatever comes after both of them meet.",
      personalConnection: "",
      image: "images/core/roy-son.jpg",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["dongjoon-lim", "mschf", "ai-image-video", "definition-of-ct"],
      status: "complete",
    },

    // ============================================================
    // PEOPLE — group anchors (Sound / Fashion / Art)
    // ============================================================
    {
      id: "group-sound",
      category: "people",
      group: "sound",
      type: "Group",
      name: "Sound",
      role: "People — group anchor",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description: "One of three People groups on this map, alongside Fashion and Art, Design & Creative Practice.",
      personalConnection: "",
      image: "",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["kim-ximya", "aphex-twin", "brutalismus-3000", "group-fashion"],
      status: "complete",
    },
    {
      id: "group-fashion",
      category: "people",
      group: "fashion",
      type: "Group",
      name: "Fashion",
      role: "People — group anchor",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description: "One of three People groups on this map, alongside Sound and Art, Design & Creative Practice.",
      personalConnection: "",
      image: "",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["brutalismus-3000", "yumin-ha", "dongjoon-lim", "vivienne-westwood"],
      status: "complete",
    },
    {
      id: "group-art",
      category: "people",
      group: "art",
      type: "Group",
      name: "Art, Design & Creative Practice",
      role: "People — group anchor",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description: "One of three People groups on this map, alongside Sound and Fashion.",
      personalConnection: "",
      image: "",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["banksy", "mschf", "teenage-engineering"],
      status: "complete",
    },

    // ---------------------------------------------------------------
    // PEOPLE — Sound
    // ---------------------------------------------------------------
    {
      id: "kim-ximya",
      category: "people",
      group: "sound",
      type: "Person",
      name: "Kim Ximya",
      role: "Rapper / Musician",
      location: "",
      representativeWork: "DOGMA (2026)",
      recentContribution: "",
      description:
        "Kim Ximya combines experimental and refined production with lyrics that feel raw, direct, and fundamental.",
      personalConnection:
        "Roy considers Kim Ximya's musical taste and artistic sensibility among the strongest in Korean music. He listens to his work regularly, owns his albums, and preordered DOGMA. His ability to maintain a distinct identity without following conventional commercial formats connects to Roy's own creative ambitions.",
      keywords: "experimental / raw / refined / independent identity",
      image: "images/people/kim-ximya.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-sound", "interest-music"],
      status: "complete",
    },
    {
      id: "aphex-twin",
      category: "people",
      group: "sound",
      type: "Person",
      name: "Aphex Twin",
      role: "Electronic Musician / Producer",
      location: "",
      representativeWork: "Selected Ambient Works 85–92",
      recentContribution: "",
      description:
        "Aphex Twin uses synthesizers, electronic sound, unconventional structures, and an enormous body of experimentation to continuously expand electronic music.",
      personalConnection:
        "Roy connects with his restless and prolific working process because Roy also moves quickly between different interests. Aphex Twin's music is both sonically satisfying and culturally significant to him. Roy frequently uses and references his music in personal visual work. He is also inspired by the way the Aphex Twin symbol has become a cultural icon beyond the music itself.",
      keywords: "synthesis / experimentation / repetition / cultural symbol / visual identity",
      image: "images/people/aphex-twin.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-sound", "teenage-engineering", "programming-languages", "interest-music"],
      status: "complete",
    },
    {
      id: "brutalismus-3000",
      category: "people",
      group: "sound",
      type: "Person",
      name: "Brutalismus 3000",
      role: "Berlin-based Electronic Music Duo (Theo Zeitner and Victoria Vassiliki Daldas)",
      location: "Berlin",
      representativeWork: "ULTRAKUNST (2023)",
      recentContribution: "Harmony (2026)",
      description:
        "Brutalismus 3000 combines techno, contemporary gabber, aggressive production, vocals, fashion, and a strong performance identity.",
      personalConnection:
        "Roy attended their concerts twice. He was also once in discussion to design a T-shirt for them, although the project stopped when communication with their manager ended. This gives their work a personal connection beyond being a musical influence. Their ability to translate sound into fashion and visual identity strongly relates to Roy's practice.",
      keywords: "gabber / performance / fashion / aggression / visual identity",
      image: "images/people/brutalismus-3000.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-sound", "group-fashion", "yumin-ha", "interest-fashion", "interest-music", "subculture-commercialization"],
      status: "complete",
    },

    // ---------------------------------------------------------------
    // PEOPLE — Fashion
    // ---------------------------------------------------------------
    {
      id: "yumin-ha",
      category: "people",
      group: "fashion",
      type: "Person",
      name: "Yumin Ha",
      role: "Fashion Creative / Curator / Founder of ymh",
      location: "Manhattan Chinatown, New York",
      representativeWork: "",
      recentContribution: "",
      description:
        "Yumin Ha's practice resembles a curatorial and collaborative platform. Rather than relying on one consistent visual author, releases bring illustrations from different minor or independent artists into clothing, often drawing from anime, manga, games, and East Asian visual culture.",
      personalConnection:
        "Roy is interested in many fields rather than committing to only one discipline. He sees Yumin Ha's approach as similar to Supreme's culture of collaboration: a platform can create identity by selecting and connecting many different creators. Roy describes Yumin Ha as being like “the DJ Khaled of clothing”—someone whose strength lies in choosing artists, assembling collaborations, and commercializing a wider creative network. Roy especially connects with the anime-influenced imagery because anime is one of his major personal interests. This is Roy's own interpretation of Yumin Ha's curatorial and collaborative role, not a confirmed statement that Yumin Ha does not design clothes.",
      keywords: "curation / collaboration / anime / artist selection / clothing as platform",
      image: "images/people/yumin-ha.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-fashion", "brutalismus-3000", "mschf", "interest-fashion", "subculture-commercialization", "photoshop-illustrator"],
      status: "complete",
    },
    {
      id: "dongjoon-lim",
      category: "people",
      group: "fashion",
      type: "Person",
      name: "Dongjoon Lim",
      role: "Co-founder and Creative Director of POST ARCHIVE FACTION (PAF)",
      location: "",
      representativeWork: "POST ARCHIVE FACTION — LEFT / CENTER / RIGHT system",
      recentContribution: "",
      description:
        "POST ARCHIVE FACTION uses restrained colors, often monochrome, while creating experimental silhouettes, pattern cutting, construction, and technical detail. The brand's LEFT, CENTER, and RIGHT system presents different transformations of familiar garments.",
      personalConnection:
        "Roy considers PAF one of the strongest fashion practices in Korea. Its combination of visual simplicity and structural complexity closely matches Roy's own preference for minimal surfaces containing intricate systems and details.",
      keywords: "monochrome / pattern / silhouette / system / experimental minimalism",
      image: "images/people/dongjoon-lim.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-fashion", "teenage-engineering", "core", "interest-fashion"],
      status: "complete",
    },
    {
      id: "vivienne-westwood",
      category: "people",
      group: "fashion",
      type: "Person",
      name: "Vivienne Westwood",
      role: "Fashion Designer",
      location: "",
      representativeWork: "The Orb — brand identity",
      recentContribution: "",
      description:
        "Vivienne Westwood connected fashion with punk, resistance, political expression, and cultural criticism. Her visual identity remained direct and recognizable, including the Orb logo.",
      personalConnection:
        "Her work may not directly determine the visual appearance of Roy's work, but her rebellious attitude and refusal to accept established conventions connect to his creative character at a fundamental level.",
      keywords: "punk / resistance / attitude / cultural criticism / identity",
      image: "images/people/vivienne-westwood.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-fashion", "banksy", "interest-fashion", "subculture-commercialization"],
      status: "complete",
    },

    // ---------------------------------------------------------------
    // PEOPLE — Art, Design & Creative Practice
    // ---------------------------------------------------------------
    {
      id: "banksy",
      category: "people",
      group: "art",
      type: "Person",
      name: "Banksy",
      role: "Anonymous Street Artist",
      location: "",
      representativeWork: "Love Is in the Bin",
      recentContribution: "",
      description: "Banksy combines anonymity, intervention, humor, public space, and social criticism.",
      personalConnection:
        "Banksy was one of the first artists Roy discovered who felt similar to the kind of creator he wanted to become. Before Roy's moodboard expanded during high school, Banksy represented experimentation, anonymity, and rebellion. Roy later referenced Love Is in the Bin in his Airplane Series, which was included in his Parsons admission portfolio.",
      keywords: "anonymity / intervention / rebellion / public space / humor",
      image: "images/people/banksy.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-art", "vivienne-westwood", "love-is-in-the-bin", "roys-airplane-series", "subculture-commercialization", "photoshop-illustrator"],
      status: "complete",
    },
    {
      id: "mschf",
      category: "people",
      group: "art",
      type: "Person",
      name: "MSCHF",
      role: "Art Collective",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "MSCHF operates like an experimental laboratory, repeatedly producing unexpected objects, situations, products, and cultural interventions.",
      personalConnection:
        "Roy is inspired by its eccentric mentality and willingness to act on strange ideas. He sees this kind of practice—making what one genuinely wants to make while reacting to society—as a source of motivation beyond marketing or profit. Working or collaborating with MSCHF is one of Roy's future ambitions.",
      keywords: "experiment / absurdity / cultural intervention / product / collective",
      image: "images/people/mschf.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-art", "yumin-ha", "love-is-in-the-bin", "core", "ai-image-video", "subculture-commercialization"],
      status: "complete",
    },
    {
      id: "teenage-engineering",
      category: "people",
      group: "art",
      type: "Person",
      name: "Teenage Engineering",
      role: "Design and Technology Company",
      location: "",
      representativeWork: "Field System",
      recentContribution: "",
      description:
        "Teenage Engineering combines industrial design, sound, interface design, hardware, graphics, and playful interaction in highly detailed electronic objects.",
      personalConnection:
        "If asked what kind of design he most wants to pursue, Roy would likely answer Teenage Engineering. He is interested in Bauhaus and Marcel Breuer, and sees Teenage Engineering as a contemporary continuation of their functional and material design spirit. He considers its products even more carefully detailed than Apple's and frequently wants to purchase its synthesizers, although their price is a barrier. Roy currently owns a Teenage Engineering EP–133 K.O. II.",
      keywords: "Bauhaus / industrial design / sound / interface / precision / play",
      image: "images/people/teenage-engineering.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["group-art", "aphex-twin", "dongjoon-lim", "field-system", "programming-languages", "interest-music"],
      status: "complete",
    },

    // ============================================================
    // INSPIRING PROJECTS
    // The assignment's two official entries are Love Is in the Bin
    // and The Field System (see #3 below). roys-airplane-series and
    // dt-map-website are Roy's own supplementary work, kept as real,
    // sourced content rather than removed — flagged in the project
    // report as a discrepancy against the "2 Inspiring Projects"
    // final count for the user to confirm or trim.
    // ============================================================
    {
      id: "love-is-in-the-bin",
      category: "projects",
      type: "Project",
      name: "Love Is in the Bin",
      role: "Maker: Banksy",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Love Is in the Bin originated when Banksy's Girl with Balloon partially shredded itself immediately after being sold at auction. The destruction and public event became part of the artwork rather than simply ending it.",
      personalConnection:
        "Roy remembers encountering the event in the news during high school and feeling shocked, amused, and energized. Banksy felt like a creative superhero to him. The work helped activate a rebellious artistic philosophy Roy had not yet been able to articulate and influenced an homage in his Parsons portfolio's Airplane Series.",
      notes: [
        {
          label: "Clarification",
          text: "Roy's interest in rebellion does not mean wanting to commit crimes or reject society. It means resisting the ways social rules, markets, gender, culture, media, and practical expectations can restrict an artist's creative philosophy.",
        },
        {
          label: "Core statement",
          text: "The destruction did not terminate the artwork. It expanded the artwork into an event, a critique, and a new object.",
        },
      ],
      image: "images/projects/love-is-in-the-bin.jpg",
      sourceUrl: null,
      sourceStatus: "to-be-added",
      relatedIds: ["banksy", "mschf", "subculture-commercialization", "definition-of-ct"],
      status: "complete",
    },
    {
      id: "field-system",
      category: "projects",
      type: "Project",
      name: "The Field System",
      role: "Maker: Teenage Engineering",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "The Field System connects portable synthesizers, sequencers, recorders, microphones, and mixers as one coherent mobile creative ecosystem.",
      personalConnection: "",
      notes: [
        {
          label: "Why it matters",
          text: "It connects sound, product design, interface design, hardware, software, portability, and visual identity. It represents Roy's interest in combining multiple disciplines within a precise physical system.",
        },
        {
          label: "Relationship to Project 1 (Love Is in the Bin)",
          text: "Love Is in the Bin represents Roy's rebellious philosophy. The Field System represents the precision, utility, and design language through which he wants to build.",
        },
      ],
      image: "images/projects/field-system.jpg",
      sourceUrl: "https://teenage.engineering/products/field-system",
      sourceStatus: "verified",
      relatedIds: ["teenage-engineering", "love-is-in-the-bin", "interest-music", "definition-of-ct"],
      status: "complete",
    },
    {
      id: "roys-airplane-series",
      category: "projects",
      type: "Project",
      name: "Airplane Series",
      role: "Maker: Roy Son",
      location: "",
      representativeWork: "Included in Roy's Parsons admission portfolio",
      recentContribution: "",
      description: "A personal series that referenced Banksy's Love Is in the Bin as homage.",
      personalConnection:
        "Roy later referenced Love Is in the Bin in his Airplane Series, which was included in his Parsons admission portfolio.",
      image: "images/projects/airplane-series.jpg",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["banksy"],
      status: "complete",
    },
    {
      id: "dt-map-website",
      category: "projects",
      type: "Project",
      name: "DT Map — Playing Field (this website)",
      role: "Maker: Roy Son",
      location: "",
      representativeWork: "velfontoffice.com/hyungrokson/dt-map/",
      recentContribution: "",
      description:
        "The map you're looking at right now — an evolving, code-built version of the Parsons “Mapping a DT Playing Field” assignment, kept alive inside Velfont Office instead of ending as a one-time Figma file.",
      personalConnection: "",
      image: "",
      sourceUrl: "/hyungrokson/dt-map/",
      sourceStatus: "verified",
      relatedIds: ["programming-languages"],
      status: "complete",
    },

    // ============================================================
    // NEW TECHNOLOGIES AND SKILLS
    // ============================================================
    {
      id: "programming-languages",
      category: "new-tech",
      type: "Skill — To Learn",
      name: "Programming Languages",
      role: "HTML / CSS / JavaScript / Python",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Roy wants to understand programming beyond copying AI-generated code. As AI becomes more important, he wants to communicate his intentions precisely, understand the systems being generated, recognize unnecessary complexity, simplify code, and maintain creative control over interactive work.",
      personalConnection: "",
      notes: [
        {
          label: "Capacity enabled",
          text: "Translating visual and conceptual ideas into functioning interactive systems while directing AI with greater technical precision.",
        },
      ],
      keywords: "code / systems / AI direction / interaction / creative control",
      image: "",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["aphex-twin", "teenage-engineering", "field-system", "dt-map-website", "core", "creative-authorship-ai"],
      status: "complete",
    },
    {
      id: "ai-image-video",
      category: "new-tech",
      type: "Skill — To Learn",
      name: "AI Image & Video Creation",
      role: "Higgsfield / generative image tools / generative video tools",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Roy has collected and imagined projects across many fields for years, but visualizing each idea traditionally requires significant time and learning a different medium. AI image and video tools allow him to materialize ideas rapidly across character design, fashion, motion, environments, and visual experiments.",
      personalConnection:
        "Roy does not want AI to control or determine his design. He wants to master these tools early enough that they become precise extensions of his direction. Faster visualization can also give him more time to develop analog and physical skills.",
      notes: [
        {
          label: "Capacity enabled",
          text: "Rapidly visualizing ideas across multiple media while retaining authorship, direction, and aesthetic control.",
        },
      ],
      keywords: "visualization / motion / direction / iteration / authorship",
      // Placeholder until Roy's actual AI-generated work is added — drop
      // the file at this exact path and the placeholder disappears.
      image: "images/skills/ai-image-video-work.jpg",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["photoshop-illustrator", "drawing", "mschf", "core", "creative-authorship-ai", "subculture-commercialization"],
      status: "complete",
    },

    // ============================================================
    // EXISTING SKILLS TO IMPROVE
    // ============================================================
    {
      id: "photoshop-illustrator",
      category: "existing-skills",
      type: "Skill — To Improve",
      name: "Photoshop & Illustrator",
      role: "",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Roy already uses Photoshop regularly, but he has not mastered its full range of tools and functions. He is also still inexperienced with Illustrator, even though it is frequently used alongside Photoshop in visual design workflows.",
      personalConnection: "",
      notes: [
        {
          label: "Current limitation",
          text: "His work often communicates the overall idea and atmosphere successfully, but he feels that the technical precision and smaller visual details are not yet developed enough.",
        },
        {
          label: "Development plan",
          text: "Roy wants to experiment with a wider range of image combinations, effects, compositing methods, masks, typography, color treatments, and raster–vector workflows. Repeated experimentation will allow him to understand the tools rather than relying on a limited set of familiar techniques.",
        },
        {
          label: "Capacity enabled",
          text: "More precise image editing, stronger graphic effects, integration of raster and vector workflows, and greater detail in both digital and printed work.",
        },
      ],
      keywords: "image editing / compositing / raster / vector / detail",
      // Deliberate placeholder — swap in one previous Photoshop-based
      // Velfont Office work when Roy supplies it.
      image: "images/skills/photoshop-illustrator-previous-work.jpg",
      imagePlaceholderText: "PREVIOUS WORK IMAGE TO BE ADDED",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["core", "ai-image-video", "drawing", "yumin-ha", "banksy", "creative-authorship-ai"],
      status: "complete",
    },
    {
      id: "drawing",
      category: "existing-skills",
      type: "Skill — To Improve",
      name: "Drawing",
      role: "",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Roy has been naturally skilled at drawing since childhood, but most of his drawing practice has relied on intuition and visual instinct. He has not systematically studied composition, perspective, human anatomy, proportion, or the structural construction of the body.",
      personalConnection: "",
      notes: [
        {
          label: "Development plan",
          text: "He wants to preserve his intuitive drawing style while building a stronger understanding of anatomy, proportion, posture, spatial composition, and intentional framing. This would allow him to design characters, objects, and scenes with greater control and consistency.",
        },
        {
          label: "Capacity enabled",
          text: "Constructing more convincing bodies and poses, designing intentional compositions, developing characters, and visualizing ideas without depending entirely on digital tools.",
        },
      ],
      keywords: "anatomy / proportion / composition / intuition / structure",
      // Deliberate placeholder — swap in one previous drawing when Roy
      // supplies it.
      image: "images/skills/drawing-previous-work.jpg",
      imagePlaceholderText: "PREVIOUS DRAWING TO BE ADDED",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["ai-image-video", "photoshop-illustrator", "core", "creative-authorship-ai"],
      status: "complete",
    },

    // ============================================================
    // PERSONAL INTERESTS OUTSIDE DT
    // Three entries — one more than the assignment's minimum of two,
    // intentionally, per the finalized brief.
    // ============================================================
    {
      id: "interest-fashion",
      category: "personal-interests",
      type: "Personal Interest",
      name: "Fashion",
      role: "",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Roy became interested in fashion around the first year of middle school. At first, he was attracted to the way different clothes could change identity, mood, and appearance. Over time, this interest became more obsessive and historical. He began exploring reproduction garments, Levi's and denim history, vintage clothing, runway collections, and broader fashion history.",
      personalConnection:
        "Roy does not claim to be a fashion historian, but he has pursued the subject more deeply than an average consumer and enjoys continuously learning about how garments carry cultural and historical meaning.",
      keywords: "clothing / identity / reproduction / vintage / history / runway",
      image: "images/interests/fashion.jpg",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["yumin-ha", "dongjoon-lim", "vivienne-westwood", "brutalismus-3000", "subculture-commercialization", "core"],
      status: "complete",
    },
    {
      id: "interest-music",
      category: "personal-interests",
      type: "Personal Interest",
      name: "Music",
      role: "",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Roy first became deeply interested in music through rap during middle school. His listening has since expanded across jazz, hip-hop, ambient, techno, Korean popular music, idol music, bands, and other genres.",
      personalConnection:
        "Rather than maintaining a small and carefully organized playlist, Roy prefers to like and collect as much music as possible so that he can continuously encounter different sounds. He is especially attracted to experimental and subcultural genres and has recently listened more frequently to instrumental music without lyrics.",
      keywords: "hip-hop / jazz / ambient / techno / discovery / subculture",
      image: "images/interests/music.jpg",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["kim-ximya", "aphex-twin", "brutalismus-3000", "teenage-engineering", "field-system", "subculture-commercialization"],
      status: "complete",
    },
    {
      id: "interest-exercise",
      category: "personal-interests",
      type: "Personal Interest",
      name: "Exercise & Physical Training",
      role: "",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Roy has participated in sports since childhood. In high school, he competed as a track-and-field athlete and achieved strong results. During Korean military service, he began weight training and continues to train when possible.",
      personalConnection: "",
      notes: [
        {
          label: "Current goal",
          text: "Roy wants to reach 75 kilograms while maintaining a relatively stable body-fat level. Later, he wants to combine strength training with endurance work and eventually participate in HYROX.",
        },
      ],
      keywords: "track and field / strength / repetition / discipline / HYROX",
      image: "images/interests/exercise.jpg",
      sourceUrl: null,
      sourceStatus: "reflection",
      // "body and clothing," "systems and repetition," and "functional
      // objects or wearables" (named in the brief as candidate links)
      // aren't nodes anywhere else in this data — left unlinked rather
      // than inventing placeholder nodes to match them. Fashion and
      // core are the two relationships that already exist and remain
      // meaningful.
      relatedIds: ["interest-fashion", "core"],
      status: "complete",
    },

    // ============================================================
    // CONCEPTS & PROBLEMS
    // ============================================================
    {
      id: "creative-authorship-ai",
      category: "concepts",
      type: "Concept / Problem",
      name: "Creative Authorship in the Age of AI",
      role: "When AI generates an image or system, who is the author—and how can a designer use AI without surrendering aesthetic judgment and creative control?",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Generative AI can quickly translate ideas into images, videos, and code, but speed can also allow the tool's defaults to replace the designer's decisions. Roy is interested in using AI as an extension of his direction rather than allowing it to determine the work's visual language. For him, authorship depends on intention, selection, iteration, technical understanding, and responsibility—not simply on who or what produced the first output.",
      personalConnection: "",
      notes: [
        {
          label: "Why it matters",
          text: "Roy wants to work across many media. AI can make that breadth possible, but only if he develops enough technical and visual judgment to recognize generic output, revise it, and maintain a distinct identity.",
        },
      ],
      keywords: "AI / authorship / control / intention / selection / responsibility",
      image: "",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["ai-image-video", "programming-languages", "photoshop-illustrator", "drawing", "mschf", "core"],
      status: "complete",
    },
    {
      id: "subculture-commercialization",
      category: "concepts",
      type: "Concept / Problem",
      name: "Subculture and Commercialization",
      role: "When a subculture becomes clothing, advertising, content, or a commercial product, does it reach a wider community—or lose the identity that made it meaningful?",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Punk, graffiti, gabber, anime, underground music, and other subcultures often develop in opposition to dominant culture. Fashion brands, media platforms, and commercial collaborators can give these cultures greater visibility, but they can also remove their histories and transform them into surface-level aesthetics.",
      personalConnection: "",
      notes: [
        {
          label: "Why it matters",
          text: "Roy is personally drawn to subcultural music, fashion, anime imagery, graffiti, and rebellious creative practices. He is interested in how creators can translate those references into products and visual communication without reducing them to temporary trends.",
        },
      ],
      keywords: "subculture / commerce / authenticity / visibility / appropriation / identity",
      image: "",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: [
        "yumin-ha",
        "vivienne-westwood",
        "banksy",
        "brutalismus-3000",
        "mschf",
        "interest-fashion",
        "interest-music",
        "love-is-in-the-bin",
        "core",
      ],
      status: "complete",
    },

    // ============================================================
    // DEFINITION OF CREATIVE TECHNOLOGY
    // ============================================================
    {
      id: "definition-of-ct",
      category: "definition",
      type: "Definition",
      name: "My Definition of Creative Technology",
      role: "",
      location: "",
      representativeWork: "",
      recentContribution: "",
      description:
        "Creative Technology is any technique, tool, or system that allows me to translate the scattered ideas in my ADHD mind into perceptible forms. I currently work mostly through computers, code, images, and digital media, but I do not think creative technology is limited to digital tools. An object, a drawing, a written text, a garment, or a physical interaction can also function as technology when it provides a method for turning an idea into an experience. For me, Creative Technology is intentionally broad because it connects different forms of making rather than defining one specific medium.",
      personalConnection: "",
      keywords: "translation / visualization / tools / systems / experience / multiple media",
      image: "",
      sourceUrl: null,
      sourceStatus: "reflection",
      relatedIds: ["core", "programming-languages", "ai-image-video", "photoshop-illustrator", "drawing", "field-system", "love-is-in-the-bin"],
      status: "complete",
    },
  ];

  window.DT_MAP_DATA = {
    categories: CATEGORIES,
    groups: GROUPS,
    nodes: NODES,
  };
})();
