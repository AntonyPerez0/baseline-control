/* ============================================================
   Teach mode.
   A curriculum that runs on the same generators as the game, so
   the thing you practice on is the thing you will be graded on.
   Each lesson: a short card, a worked example with the answer
   already on it, practice with hints, then a check that gates
   the next lesson.
   ============================================================ */
(function(){
"use strict";
var B = window.BC;

/* ---------------- curriculum ----------------
   card    short setup, a paragraph or three
   example {kind, level, want} a scenario shown fully solved and annotated
   practice{kind, level, n} scenarios you answer, hints available, not scored
   check   {kind, level, n, pass} scenarios you answer cold, gates the next lesson
   quiz    hand written multiple choice, used where no generator fits
   keys    what to walk away with                                          */

function q(text, opts, a, why){ return { q:text, o:opts, a:a, w:why }; }

var MODULES = [

/* ---------------------------------------------------------------- */
{ id:"m1", title:"What this job is", tier:"E1", lessons:[

{ id:"1.1", title:"The problem configuration management solves",
  card:[
    "A satellite is built from tens of thousands of parts, over years, by people who leave. Two years after a unit ships, something fails. Somebody has to be able to say exactly what was in that unit, to what drawing, at what revision, and who approved every change that got it there.",
    "That is the whole job. Not paperwork for its own sake: the ability to reconstruct the truth about a physical object long after everyone who touched it has moved on.",
    "Everything else in this course is machinery for keeping that answer available and correct."
  ],
  quiz:[
    q("A unit fails in the field four years after delivery. What does configuration management have to be able to produce?",
      ["The exact as built configuration of that unit and the approved changes that produced it",
       "The names of everyone who worked on it",
       "The original cost estimate",
       "The test procedure used at acceptance, and nothing more"], 0,
      "Everything CM does exists to keep that answer available and correct years later."),
    q("Why does a released document need to stay retrievable at the revision it was released at, not just at its latest revision?",
      ["Because hardware was built to that revision and that is the only record of what was built",
       "Because auditors like history",
       "Because the drafter might want to undo a change",
       "Because storage is cheap"], 0,
      "The old revision is not history, it is the specification for hardware that exists."),
    q("Which of these is not configuration management's job?",
      ["Deciding whether the design is a good design",
       "Recording what the design currently is",
       "Controlling how the design is allowed to change",
       "Proving the built article matches the design"], 0,
      "CM does not judge engineering merit. It controls identity, change, record and verification. The board judges merit, and CM runs the board.")
  ],
  check:{ kind:"quiz", n:3, pass:0.66 },
  keys:["The deliverable is a truthful, reconstructable record of a physical thing.",
        "Old revisions matter because hardware was built to them.",
        "CM controls identity, change, record and verification. It does not judge the design."] },

{ id:"1.2", title:"The five core functions",
  card:[
    "EIA-649 is the national consensus standard the Department of Defense points to, in place of the cancelled MIL-STD-973. It is principle based, which means it says what has to be true and leaves how to a program's configuration management plan.",
    "Five functions, and you should be able to name them and give an example of each without pausing. Planning and management. Identification. Change management. Status accounting. Verification and audit.",
    "Every task in this simulator is one of those five. When you cannot see what a task is for, ask which of the five it belongs to."
  ],
  quiz:[
    q("Which of these is not one of the five core functions?",
      ["Configuration budgeting","Configuration identification","Configuration status accounting","Configuration verification and audit"], 0,
      "The five are planning and management, identification, change management, status accounting, and verification and audit."),
    q("A program writes down which items will be configuration items, which tools will hold the baseline, and who sits on the board. Which function is that?",
      ["Planning and management","Identification","Change management","Status accounting"], 0,
      "That is the configuration management plan, which is the output of the planning function."),
    q("Why is a principle based standard harder to apply than a prescriptive one?",
      ["Because it tells you what must be true and leaves you to decide how, which has to be written down and approved",
       "Because it is longer","Because it has no examples","Because it changes often"], 0,
      "That decision is the CM plan, and tailoring approved in the plan is what makes a lightweight process legitimate rather than convenient.")
  ],
  check:{ kind:"quiz", n:3, pass:0.66 },
  keys:["Planning, identification, change management, status accounting, verification and audit.",
        "EIA-649 replaced MIL-STD-973 and is principle based.",
        "Tailoring lives in the CM plan and has to be approved, not assumed."] },

{ id:"1.3", title:"Configuration items",
  card:[
    "Not everything gets its own baseline. A configuration item is something designated for separate configuration management because it is critical, because it crosses an interface, or because it has to be supported in the field. A configuration item carries its own specification and its own baseline.",
    "Designate too many and the program drowns in paperwork. Designate too few and the things that matter are not controlled. The selection is an engineering judgment and it belongs in the CM plan.",
    "Software counts. A computer software configuration item is identified by its build, and a build that cannot be reproduced from what you recorded is not under control."
  ],
  quiz:[
    q("What makes something a configuration item?",
      ["It is designated for separate configuration management because of criticality, interfaces or support needs",
       "It has a drawing","It has a serial number","It was purchased rather than made"], 0,
      "The designation is a decision, recorded in the CM plan, not a property of the part."),
    q("A flight software build is delivered. What identifies it in the product baseline?",
      ["The build label together with the version description that lists the source, tools and settings used to produce it",
       "The release branch name","The date it was built","The lead developer's approval"], 0,
      "If it cannot be reproduced from what you recorded, it is not under configuration control."),
    q("What is the cost of designating too many configuration items?",
      ["Every one carries its own specification, baseline and change traffic, and the program drowns in process",
       "Nothing, more control is always better","The customer pays for it","Drawings take longer to release"], 0,
      "It is a real trade. Too few is dangerous, too many is fatal to schedule.")
  ],
  check:{ kind:"quiz", n:3, pass:0.66 },
  keys:["A configuration item is designated, not discovered.",
        "Software is a configuration item and is identified by a reproducible build.",
        "Both over designation and under designation cost you."] },

{ id:"1.4", title:"Revision letters and document identity",
  card:[
    "Revisions advance one letter at a time: A, B, C, D, E, F, G, H, J, K, L, M, N, P, R, T, U, V, W, Y, then AA, AB and so on. I, O, Q, S, X and Z are never used, because on a print they read as numerals or as each other.",
    "That rule matters for a reason that has nothing to do with typography. If a package proposes a revision two letters past the current one, a revision exists somewhere that the vault does not know about. Fixing the letter without finding the missing revision hides the actual problem.",
    "Below is a real package with that exact fault, already solved and annotated. Read the title block first."
  ],
  example:{ kind:"release", level:1, want:{ defect:"rev-skip" } },
  practice:{ kind:"release", level:1, n:2 },
  check:{ kind:"release", level:1, n:2, pass:0.7 },
  keys:["A, B, C, D, E, F, G, H, J, K, L, M, N, P, R, T, U, V, W, Y.",
        "I, O, Q, S, X and Z are never revision letters.",
        "A gap means a release happened outside the system. Go find it."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m2", title:"Baselines", tier:"E1", lessons:[

{ id:"2.1", title:"The three baselines",
  card:[
    "A baseline is an agreed statement of what the thing is, at a point in time, that changes only through a controlled process. Three of them, set at three reviews.",
    "The functional baseline is the system level performance requirements, set around the system requirements review. The allocated baseline is the item performance specifications derived from it and allocated to each configuration item, set at preliminary design review. The product baseline is the build to package, drawings, parts lists and software, set at critical design review.",
    "After a successful physical configuration audit, the product baseline becomes the verified product baseline: not just what you meant to build, but what you demonstrably did build."
  ],
  practice:{ kind:"gate", level:1, n:2 },
  check:{ kind:"gate", level:1, n:2, pass:0.7 },
  keys:["Functional at SRR, allocated at PDR, product at CDR.",
        "The product baseline is what you build to and inspect against.",
        "PCA turns the product baseline into the verified product baseline."] },

{ id:"2.2", title:"Who controls a baseline",
  card:[
    "Control attaches when the customer approves the baseline, not when the program feels ready. Once the government has approved a baseline, changes to it are Class I and only the government can authorize them.",
    "This is the single fact that decides most of your working day. It is why classification matters, why a contractor board can approve a Class I change for submittal and never for implementation, and why the contracting officer is the only person who can actually say yes.",
    "Before approval the baseline is developmental and the contractor controls it. That is a real distinction and programs get it wrong in both directions."
  ],
  quiz:[
    q("An item specification is changed after the allocated baseline is approved but before critical design review. What is it?",
      ["Class I, because the allocated baseline is under government control",
       "Class II, because the product baseline is not set yet",
       "Not a change until CDR","A deviation"], 0,
      "Government control attaches at approval of the baseline, not at the next review."),
    q("Your board approves a Class I change that the contracting officer has not acted on. What did the board just authorize?",
      ["Submittal of the change to the government, not implementation",
       "Implementation, since the board owns the product baseline",
       "Implementation on units not yet started","Nothing at all"], 0,
      "A contractor board can approve a Class I change for submittal. Only the contracting officer authorizes implementation."),
    q("Who controls the functional baseline on a typical development contract?",
      ["The government","The contractor change control board","The chief engineer","The supplier"], 0,
      "Once approved, it is theirs. Yours to propose changes to, not to change.")
  ],
  check:{ kind:"quiz", n:3, pass:0.66 },
  keys:["Control attaches at approval.",
        "A contractor board approves Class I for submittal, never for implementation.",
        "The contracting officer is the approval authority."] },

{ id:"2.3", title:"Reading a change package",
  card:[
    "Everything you will do for the next year happens inside a document that looks like this one. Read it once now with the answer already on it, so the shape becomes familiar before you are asked to judge one.",
    "Four regions matter. The title block says what document this is and at what revision. Change control data says what kind of change it is, who approved it and which units get it. The impact worksheet says what the change touches. The approvals say who has signed.",
    "Program context at the top is what the vault and the unit register say right now. The package has to agree with it. Most discrepancies are simply a field in the package disagreeing with a field somewhere else."
  ],
  example:{ kind:"release", level:1, want:{ clean:true } },
  quiz:[
    q("Where do you look to find out which units a change applies to?",
      ["Effectivity, in change control data","The title block","The impact worksheet","The approvals"], 0,
      "Effectivity is the instruction to the floor about which units get this."),
    q("The package says Class II. Where do you check whether that is right?",
      ["The impact worksheet","The reason code","The approvals","The related documents"], 0,
      "Classification is a conclusion. The impact worksheet is the evidence for it."),
    q("What is program context for?",
      ["It is what the vault and the unit register say right now, so you can see where the package disagrees with reality",
       "It is decoration","It repeats the title block","It is the customer's copy"], 0,
      "Most discrepancies are a disagreement between two fields, and one of them is often outside the package.")
  ],
  check:{ kind:"quiz", n:3, pass:0.66 },
  keys:["Title block, change control data, impact worksheet, approvals.",
        "Classification is a conclusion; the impact worksheet is its evidence.",
        "A discrepancy is usually two fields disagreeing."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m3", title:"Change control", tier:"E1 and E2", lessons:[

{ id:"3.1", title:"The release audit",
  card:[
    "This is the associate analyst's day. A package arrives, you check it, and you decide whether it goes into the vault. The vault will accept whatever you release and keep it forever, which is the entire reason the check exists.",
    "Three dispositions. Release, when nothing blocks it. Release with comments, when the problems are administrative and holding the floor would cost more than the fault. Return to originator, when at least one problem is a hard stop.",
    "A hard stop is anything that would put a wrong or unauthorized configuration into the baseline: a missing signature, a bad classification, an impossible effectivity, a part number that should have changed. A comment is a wrong reason code or a sheet count."
  ],
  example:{ kind:"release", level:1, want:{ minDefects:2 } },
  practice:{ kind:"release", level:1, n:3 },
  check:{ kind:"release", level:1, n:3, pass:0.7 },
  keys:["Release, release with comments, or return.",
        "Hard stops are anything that corrupts the baseline or lacks authority.",
        "Do not hold the floor for a formatting comment."] },

{ id:"3.2", title:"Approvals and independence",
  card:[
    "A package is not releasable until every discipline the change touches has signed. Which disciplines those are depends on the change: a structural change needs stress, a software change needs software engineering, a change with a safety impact needs system safety, and a Class I change needs contracts and program management.",
    "Two things go wrong in the approvals block, and both are easy to miss. A block is simply empty. Or a signature is dated before the change request itself, which means somebody signed a change that did not exist yet, or the signature was carried across from an earlier package.",
    "The third is subtler. The checker is an independent review. When the same person appears as both preparer and checker, there was no independent check, whatever the block says."
  ],
  example:{ kind:"release", level:2, want:{ area:"approvals" } },
  practice:{ kind:"release", level:2, n:2 },
  check:{ kind:"release", level:2, n:2, pass:0.7 },
  keys:["Required disciplines follow the change, not a fixed list.",
        "A signature dated before the change request is not a signature.",
        "One person cannot be their own independent checker."] },

{ id:"3.3", title:"Effectivity",
  card:[
    "Effectivity is the answer to which units get this change. A serial number range, a lot, a date, or a build label for software. Blank means manufacturing decides, and manufacturing should never be the one deciding.",
    "Two faults. An impossible range, which starts after it ends and cannot be worked or loaded into status accounting. And a range that reaches units already delivered and accepted, with no retrofit direction, which is a quiet attempt to change the configuration of hardware the customer already owns.",
    "That second one is why program context shows you which units are delivered. Compare the effectivity to it, every time."
  ],
  example:{ kind:"release", level:2, want:{ area:"effectivity" } },
  practice:{ kind:"release", level:2, n:2 },
  check:{ kind:"release", level:2, n:2, pass:0.7 },
  keys:["Effectivity is an instruction, not a formality.",
        "An inverted range cannot be worked.",
        "Reaching delivered units needs retrofit direction or a later start."] },

{ id:"3.4", title:"Class I and Class II",
  card:[
    "The most important call you make. A change is Class I when it affects an approved baseline in a way the government controls. Any single one of these does it: form fit or function of a controlled item, a released interface, safety, weight beyond the specified limit, specified performance or reliability, contract cost, contract schedule, government furnished equipment, delivered manuals, approved qualification or acceptance test requirements, interchangeability, sources on a source control drawing, or retrofit of delivered units.",
    "Everything else is Class II, approved by the contractor board, with the government representative concurring in the classification rather than in the change.",
    "Under classifying is the expensive mistake. It puts an unapproved change into the product baseline. Over classifying is merely slow."
  ],
  example:{ kind:"ecp", level:2, want:{ cls:1 } },
  practice:{ kind:"ecp", level:2, n:3 },
  check:{ kind:"ecp", level:2, n:3, pass:0.7 },
  keys:["Any one trigger makes it Class I.",
        "Read the impact worksheet before the description.",
        "Under classifying corrupts the baseline. Over classifying only costs time."] },

{ id:"3.5", title:"The changes that fool people",
  card:[
    "Classification is not hard because the list is long. It is hard because the description and the truth disagree.",
    "Things that sound cosmetic and are Class I: a surface finish change on a wear surface, because it changes life. A fastener with the same envelope in a different alloy, because same size is not the same item. A tolerance opened to improve yield, because parts built to the new limits may not be interchangeable with parts already accepted. A control constant changed in flight software, because that is specified performance.",
    "Things that sound major and are Class II: forty grams added when the allocation has kilograms of margin and the specified limit is untouched. An internal process change that leaves the released design and the item itself alone. A supplier moving production between their own qualified plants when the source control drawing names the company.",
    "Read the worksheet. Then read the description again and ask what actually changed about the item."
  ],
  example:{ kind:"ecp", level:3, want:{ trap:true } },
  practice:{ kind:"ecp", level:3, n:3 },
  check:{ kind:"ecp", level:3, n:3, pass:0.66 },
  keys:["Same envelope is not the same item.",
        "Weight is Class I only past the specified limit.",
        "A process change that leaves the released design alone stays in the house."] },

{ id:"3.6", title:"Priority",
  card:[
    "Class says who approves. Priority says how fast it moves. They are independent and people mix them up constantly.",
    "Emergency: a safety condition likely to cause serious injury or major damage, or a condition that has stopped production. Urgent: a potentially hazardous condition, or a change that must go now to hold a milestone or to capture a benefit that expires. Routine: everything else, through the normal board cycle.",
    "The context paragraph under the description is where the priority lives. A Class II change can be an emergency and a Class I change can be routine."
  ],
  practice:{ kind:"ecp", level:2, n:2 },
  quiz:[
    q("A wiring error has stopped the production line. The change to fix it touches no baseline the government controls. What is it?",
      ["Class II, Emergency","Class I, Emergency","Class II, Routine","Class I, Urgent"], 0,
      "Class and priority are independent. Production stoppage makes it an emergency regardless of class."),
    q("A change would save real money, but only if it reaches the floor before the next lot release.",
      ["Urgent","Emergency","Routine","It depends on the class"], 0,
      "A benefit that expires is the textbook urgent case."),
    q("System safety calls a condition potentially hazardous but not immediate.",
      ["Urgent","Emergency","Routine","Deferred"], 0,
      "Emergency is reserved for likely serious injury or major damage, or a stopped line.")
  ],
  check:{ kind:"ecp", level:2, n:3, pass:0.7 },
  keys:["Class is who approves. Priority is how fast.",
        "Emergency means a serious hazard or a stopped line.",
        "Urgent means a milestone or a benefit that expires."] },

{ id:"3.7", title:"Where the change goes",
  card:[
    "A Class I change goes to the procuring contracting officer as a formal engineering change proposal, and it is not authorized until they approve it.",
    "A Class II change does not. It goes to the government representative as a change record, and what they concur in is your classification, not the change itself. That is a real distinction: they are checking that you called the class correctly.",
    "Neither of those is a request for deviation. A deviation asks permission to depart from a requirement on a limited number of units. It is not a change to the requirement and it does not replace an engineering change proposal."
  ],
  practice:{ kind:"ecp", level:3, n:2 },
  check:{ kind:"ecp", level:3, n:3, pass:0.7 },
  keys:["Class I: formal ECP to the contracting officer for approval.",
        "Class II: change record to the government representative, who concurs in the classification.",
        "A deviation is a different instrument entirely."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m4", title:"Identity and interchangeability", tier:"E2", lessons:[

{ id:"4.1", title:"Form, fit and function",
  card:[
    "Form is the physical characteristics: size, shape, mass, finish. Fit is the ability to interface with other items. Function is what the item does and how well it does it.",
    "Those three words are doing more work than they look like. They are the test for interchangeability, and interchangeability is the test for whether a change needs a new part number. They are also one of the Class I triggers.",
    "The question is never whether the drawing changed. It is whether the item changed."
  ],
  quiz:[
    q("A drawing is redrawn in a new CAD system with identical geometry, dimensions and notes, verified by model comparison. Did form, fit or function change?",
      ["No. How the drawing was produced is not a property of the item",
       "Yes, form changed","Yes, fit changed","Cannot be determined"], 0,
      "The item is unchanged. Revise and move on."),
    q("A bearing journal finish changes from 63 to 32 microinch to extend wear life. No dimensions change.",
      ["Function changed, because wear life is what the item does",
       "Nothing changed, the dimensions are the same",
       "Only form changed and that does not matter",
       "Fit changed"], 0,
      "A finish change on a wear surface changes the performance and life of the item."),
    q("Why is form, fit and function the test for interchangeability rather than the drawing revision?",
      ["Because interchangeability is a property of the item, and the drawing only describes it",
       "Because revisions are unreliable","Because drawings are optional","Because the customer says so"], 0,
      "Ask what changed about the item, not what changed on the sheet.")
  ],
  check:{ kind:"quiz", n:3, pass:0.66 },
  keys:["Form is physical, fit is interface, function is what it does.",
        "FFF is the test for interchangeability.",
        "The question is whether the item changed, not whether the drawing did."] },

{ id:"4.2", title:"New part number, or a revision",
  card:[
    "Revise in place, keeping the part number, when the changed item is fully interchangeable with what it replaces in every application. Assign a new part number when it is not.",
    "Never reuse a part number for an item that is not interchangeable with what that number already means. That one rule prevents more field failures than anything else in this discipline, because a part number is a promise about what will happen when somebody installs it in five years.",
    "Whether the old number stays alive is a separate question. It stays if something still needs the old item. It is superseded if nothing does."
  ],
  example:{ kind:"ipn", level:2, want:{ key:"new-super" } },
  practice:{ kind:"ipn", level:2, n:3 },
  check:{ kind:"ipn", level:2, n:3, pass:0.7 },
  keys:["Interchangeable in every application means revise in place.",
        "Not interchangeable means a new number.",
        "Never reuse a number for a non interchangeable item."] },

{ id:"4.3", title:"One way interchangeability",
  card:[
    "Sometimes the new item can be used everywhere the old one was, but the old one cannot be used where the new one is required. A tolerance tightened. A bracket made stronger and heavier. A board given a conformal coating that qualifies it for a case the uncoated one never covered.",
    "That is one way interchangeability. It still takes a new part number, and the relationship gets recorded so nobody installs the old item where the new one is required.",
    "The test is directional. Ask it twice: can the new one go everywhere the old one went, and can the old one go everywhere the new one goes."
  ],
  example:{ kind:"ipn", level:2, want:{ key:"new-oneway" } },
  practice:{ kind:"ipn", level:3, n:3 },
  check:{ kind:"ipn", level:3, n:3, pass:0.7 },
  keys:["Ask the interchangeability question in both directions.",
        "One way still means a new number.",
        "Record the relationship so the old item does not get installed where it will not do."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m5", title:"Departures from the baseline", tier:"E2", lessons:[

{ id:"5.1", title:"Deviation and waiver",
  card:[
    "A deviation is written authorization, granted before manufacture, to depart from a requirement for a specific number of units or a specific period. A waiver is written authorization to accept an item that already departs from a requirement, but is still considered suitable for use.",
    "The whole distinction is timing. Before the fact is a deviation. After the fact is a waiver. Everything else about them is the same: limited, authorized by the customer, and recorded against the units it covers.",
    "Neither one changes the requirement. EIA-649 folds both under the single word variance, and defense contracts still say request for deviation and request for waiver, so know both vocabularies."
  ],
  example:{ kind:"variance", level:2, want:{ key:"rfw" } },
  practice:{ kind:"variance", level:2, n:3 },
  check:{ kind:"variance", level:2, n:3, pass:0.7 },
  keys:["Before manufacture is a deviation. After is a waiver.",
        "Neither changes the requirement.",
        "EIA-649 says variance; DoD contracts say RFD and RFW."] },

{ id:"5.2", title:"When it is neither",
  card:[
    "Two traps sit on either side of the variance question.",
    "If the requirement itself has to change permanently, for all units, that is an engineering change. A deviation repeated forever is a design problem being managed with paperwork.",
    "And if the nonconformance is correctable and correcting it is cheap, correct it. A variance is authorization to live with something, not a shortcut around rework. A pin that backed out gets reseated."
  ],
  practice:{ kind:"variance", level:3, n:3 },
  check:{ kind:"variance", level:3, n:3, pass:0.7 },
  keys:["Permanent change to the requirement is an engineering change.",
        "Correctable and cheap means rework, not a variance.",
        "A recurring deviation is a design problem in disguise."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m6", title:"Status accounting", tier:"E2 and E3", lessons:[

{ id:"6.1", title:"What status accounting answers",
  card:[
    "Status accounting is the record of what the configuration is, what it was at any past point, and what is pending against it. The question it exists to answer is: what exactly is serial number seven, as it sits, and how did it get that way.",
    "It is arithmetic, not judgment. Take the change notices released on or before the date you were asked about. Keep the ones whose effectivity covers the unit. Add any retrofit that had actually been worked by that date. Read off the highest revision among them.",
    "The mistake everyone makes once is answering with the current revision. Answer the date you were asked about."
  ],
  example:{ kind:"csa", level:2 },
  practice:{ kind:"csa", level:2, n:3 },
  check:{ kind:"csa", level:2, n:3, pass:0.7 },
  keys:["Released on or before the date, effectivity covers the unit, retrofit actually worked.",
        "Take the highest revision among those.",
        "Answer the date asked, not today."] },

{ id:"6.2", title:"Retrofit and the units that get missed",
  card:[
    "Effectivity usually starts at some unit and runs forward, which leaves the units below it at the old configuration. That is normal and it is exactly the population that a retrofit exists to catch up.",
    "So a change notice with retrofit direction has two populations: units that get it on the line, and units that get it worked back into them afterwards. Those have different dates, and a status accounting question asked between those dates has a different answer for each group.",
    "This is where the fleet gets complicated, and it is why an as built record is per unit rather than per drawing."
  ],
  example:{ kind:"csa", level:3, want:{ retro:true } },
  practice:{ kind:"csa", level:3, n:3 },
  check:{ kind:"csa", level:3, n:3, pass:0.7 },
  keys:["Units below the effectivity start are the retrofit population.",
        "Incorporation and retrofit have different dates.",
        "The as built record lives per unit."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m7", title:"The change control board", tier:"E2 and E3", lessons:[

{ id:"7.1", title:"Who is in the room",
  card:[
    "The board is a cross functional body that dispositions changes against a baseline. Engineering brings the analysis. Quality checks the package is complete and the classification holds. Manufacturing asks about effectivity and work in process, because they are the ones who stop the line. Safety will not concur while a hazard report is open. Contracts knows whether there is a funding vehicle. Program management wants it done. Configuration management runs the meeting and writes down what happened.",
    "Each of them cares about one thing, reliably. Learning what each one cares about is most of learning to read a board.",
    "Below is a board already dispositioned, with the reasoning shown."
  ],
  example:{ kind:"ccb", level:2 },
  quiz:[
    q("Safety has an open hazard report against the failure mode the change addresses. What does the board do?",
      ["Defer pending additional data","Approve for implementation","Disapprove","Approve with conditions"], 0,
      "An open hazard against the failure mode the change touches means the board does not yet know what it is approving."),
    q("Contracts says there is no funding vehicle for a change with real cost.",
      ["Defer pending contract action","Approve anyway, contracts will catch up","Disapprove","Return to originator"], 0,
      "Authorizing work with no vehicle puts the company at risk and puts you in the middle of it."),
    q("Manufacturing says the effectivity as written catches eleven units already in work.",
      ["Approve with conditions, with the corrected effectivity recorded in the minutes",
       "Defer","Disapprove","Approve as written"], 0,
      "The change is fine. The effectivity is not. Fix it as a condition and write the condition down.")
  ],
  check:{ kind:"ccb", level:2, n:2, pass:0.7 },
  keys:["Each function reliably cares about one thing.",
        "A nonconcur usually decides the disposition.",
        "Conditions go in the minutes with an owner."] },

{ id:"7.2", title:"Dispositions",
  card:[
    "Six of them, and picking the right one is the skill. Approve for implementation. Approve for submittal to the government, which is the only thing a contractor board can do with a Class I change the contracting officer has not approved. Approve with conditions, when the change is sound but something has to be fixed first. Defer pending additional data. Disapprove. Return to the originator, when the package is not complete enough to act on.",
    "Deferring is a real answer, not a failure. A board that never defers is a board that is not reading the packages.",
    "Work it in this order: is the package complete, is anything open against it, is it funded, is it justified, does the government still have to approve it."
  ],
  practice:{ kind:"ccb", level:3, n:2 },
  check:{ kind:"ccb", level:3, n:2, pass:0.7 },
  keys:["Class I with no PCO approval means approve for submittal.",
        "Incomplete package means return, not defer.",
        "Deferring is a real answer."] },

{ id:"7.3", title:"Minutes",
  card:[
    "Minutes are not a transcript. They are three separate records that happen to be taken at the same meeting.",
    "An action item is a named person committing to do something, and it gets an owner and a due date in the action log. A decision is the board disposing of something, and it goes in the decision record. Everything else is discussion, captured as narrative, tracked against nothing.",
    "Minutes that separate those three are the difference between a board that closes items and a board that repeats itself. This is an associate level task and it is one of the fastest ways to become useful."
  ],
  example:{ kind:"minutes", level:1 },
  practice:{ kind:"minutes", level:1, n:2 },
  check:{ kind:"minutes", level:1, n:2, pass:0.7 },
  keys:["Action: a named owner and a time.",
        "Decision: the board disposing of something.",
        "Discussion: everything else, tracked against nothing."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m8", title:"Data management", tier:"E1 and E3", lessons:[

{ id:"8.1", title:"CDRL and the data item description",
  card:[
    "The contract data requirements list is the list of everything you owe the customer as data. Each line item names a deliverable, cites a data item description that specifies its content and format, sets a due date and a distribution, and says whether the government approves it or receives it for information.",
    "A CDRL line is a contract requirement. Missing one is a contract delinquency, and it is one of the very few configuration and data management numbers a program manager watches every week.",
    "Citing the wrong data item description lets the customer reject the document on format alone, without ever reading it."
  ],
  example:{ kind:"cdrl", level:2 },
  practice:{ kind:"cdrl", level:2, n:2 },
  check:{ kind:"cdrl", level:2, n:2, pass:0.7 },
  keys:["A CDRL line is a contract requirement, not a courtesy.",
        "The DID is the specification for the document.",
        "Delinquencies are watched weekly."] },

{ id:"8.2", title:"Markings and the review window",
  card:[
    "Every controlled technical document carries a distribution statement. Classified deliverables carry portion markings as well as an overall marking, so a reader knows what they can extract. A missing marking is not a formatting comment, it is the reason a document cannot leave the building.",
    "The other trap is timing. An approval deliverable needs the full contractual review period before the milestone it supports. Submitting on the last legal day is technically on time and practically useless, and everyone downstream knows it.",
    "Late is worse. Late shows up on the customer delinquency report."
  ],
  practice:{ kind:"cdrl", level:3, n:2 },
  check:{ kind:"cdrl", level:3, n:2, pass:0.7 },
  keys:["Distribution statement always; portion markings when classified.",
        "Leave the full review window before the milestone.",
        "On time and useless is still a problem."] },

{ id:"8.3", title:"SDRL and flowdown",
  card:[
    "Your obligations to the customer become your suppliers' obligations to you. A subcontractor data requirements list is the same instrument flowed down through the subcontract.",
    "If the flowdown is wrong you will be delinquent on data you never had the right to demand, and finding that out late is expensive. Read what you flowed down before you chase somebody for it.",
    "When a supplier is late, keep contracts on the thread. The subcontract is the only leverage that exists, and the moment you take contracts off you have given it up."
  ],
  practice:{ kind:"sdrl", level:3, n:2 },
  check:{ kind:"sdrl", level:3, n:2, pass:0.7 },
  keys:["CDRL obligations flow down as SDRL obligations.",
        "A bad flowdown makes you delinquent on data you cannot demand.",
        "Keep contracts on the thread."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m9", title:"Configuration audits", tier:"E3", lessons:[

{ id:"9.1", title:"The functional configuration audit",
  card:[
    "An FCA verifies that the configuration item has met the requirements in its specification. The evidence is test data, analysis, demonstration and inspection records, traced from each requirement to the event that verified it and the record that closed it.",
    "What you are looking for: a requirement with no verification method, a test run to a superseded procedure, a measured result outside its limit recorded as a pass with no waiver, discrepancy reports still open at audit, two requirements pointing at one test case that only exercises one of them.",
    "The question the FCA asks is always: does it meet the requirement, and can you show me."
  ],
  example:{ kind:"audit", level:3, want:{ type:"FCA" } },
  practice:{ kind:"audit", level:3, n:2 },
  check:{ kind:"audit", level:3, n:2, pass:0.7 },
  keys:["FCA is about meeting requirements, on evidence.",
        "Trace has to run both ways with no orphans.",
        "A result outside the limit needs a waiver, not a pass."] },

{ id:"9.2", title:"The physical configuration audit",
  card:[
    "A PCA verifies that the item as built matches the technical documentation. The evidence is the as built configuration list against the released drawings and parts lists.",
    "What you are looking for: an as built list at an older revision than the one effective on that unit, a wrong dash number installed, nameplate marking that disagrees with the title block, serialized traceability that cannot be produced, an approved waiver in effect with no reference in the as built record.",
    "A successful PCA is what turns the product baseline into the verified product baseline. The question it asks is always: does the thing match the paper."
  ],
  example:{ kind:"audit", level:3, want:{ type:"PCA" } },
  practice:{ kind:"audit", level:3, n:2 },
  check:{ kind:"audit", level:3, n:2, pass:0.7 },
  keys:["PCA is about the built article matching the technical data.",
        "A waiver in effect belongs in the as built record.",
        "PCA establishes the verified product baseline."] },

{ id:"9.3", title:"Which audit owns the finding",
  card:[
    "In practice the two audits are often run together by the same team on the same day, and an auditor writes down whatever they see. The scope distinction still decides which audit's finding list it lands in, and that is a question you will be asked.",
    "Meeting the requirement, on evidence: FCA. Matching the technical data, on inspection: PCA.",
    "Some lines are neither, because nothing in them departs from the baseline. Calling a conforming line a finding costs the program a response and costs you credibility."
  ],
  practice:{ kind:"audit", level:4, n:2 },
  check:{ kind:"audit", level:4, n:3, pass:0.7 },
  keys:["Requirement and evidence: FCA. Article and drawing: PCA.",
        "Often run together, still scoped separately.",
        "A conforming line is not a finding."] }
]},

/* ---------------------------------------------------------------- */
{ id:"m10", title:"The senior job", tier:"E4 and E5", lessons:[

{ id:"10.1", title:"The CM plan and tailoring",
  card:[
    "A senior analyst writes the configuration management plan. It says which items are configuration items, which tools hold the baseline, who sits on the board and at what threshold, how status accounting is reported, and which parts of the standard apply in what depth.",
    "That last part is tailoring, and it is the whole reason a principle based standard works. A two year risk reduction effort with eleven people and one article does not run the process a six satellite production program runs. What shrinks is the ceremony. What never shrinks is identification and status accounting, because the article still has to be reproducible.",
    "Tailoring approved with the plan is legitimate. Tailoring nobody wrote down is just a process that is not being followed."
  ],
  quiz:[
    q("A small risk reduction program cites EIA-649 with no tailoring. What goes in the CM plan?",
      ["Tailoring: fewer configuration items, a light board, full identification and status accounting, approved with the plan",
       "The full enterprise process, since the standard was cited untailored",
       "A deliberately vague plan so nothing is over committed",
       "A request to remove the CM requirement"], 0,
      "The principles hold at every scale. The ceremony is what scales."),
    q("What makes tailoring legitimate rather than convenient?",
      ["It is written into the plan and approved","It is agreed verbally with the chief engineer",
       "It saves money","It matches what the last program did"], 0,
      "Undocumented tailoring is indistinguishable from a process nobody follows."),
    q("Which two functions should never be tailored away, however small the program?",
      ["Identification and status accounting","Planning and audit","Change management and audit","Planning and identification"], 0,
      "Without them there is no reproducible article and no record of what was built.")
  ],
  check:{ kind:"quiz", n:3, pass:0.66 },
  keys:["The CM plan is where tailoring becomes legitimate.",
        "Ceremony scales. Identification and status accounting do not.",
        "Undocumented tailoring is a process nobody follows."] },

{ id:"10.2", title:"One authoritative source",
  card:[
    "Model based engineering puts the definition in the CAD model. Most programs still produce a two dimensional drawing from it, and somewhere a person maintains both. Two manually maintained authoritative artifacts diverge. Always. The only question is when you find out.",
    "The senior job is not to buy a tool. It is to decide which artifact is authoritative, write that into the CM plan, make everything else derived and regenerated rather than maintained, and reconcile the disagreements that already exist.",
    "A digital thread is that decision plus the traceability that follows from it. Without the decision it is a slogan."
  ],
  example:{ kind:"senior", level:4 },
  practice:{ kind:"senior", level:4, n:2 },
  check:{ kind:"senior", level:4, n:2, pass:0.7 },
  keys:["Two maintained sources of truth diverge.",
        "Declare one authoritative and regenerate the rest.",
        "The thread is a governance decision, not a purchase."] },

{ id:"10.3", title:"Governance across programs",
  card:[
    "When several programs use a common item, governance follows the item and not the organization chart. The shared item needs one baseline and one board with the programs as members. Everything program unique stays local.",
    "The failure modes are symmetrical. Leave four boards alone and the shared item quietly acquires four configurations. Consolidate everything into one enterprise board and people sit through items that do not concern them until they stop attending.",
    "Unbaselined interfaces are the same problem in a harder form. Hardware being built against a draft interface control document is the highest consequence configuration risk there is, and the fix is governance plus making the exposure visible to whoever can fund it."
  ],
  example:{ kind:"senior", level:4, want:{ title:"interface" } },
  practice:{ kind:"senior", level:5, n:2 },
  check:{ kind:"senior", level:5, n:2, pass:0.7 },
  keys:["Governance follows the item.",
        "One board for the shared item, local boards for the rest.",
        "An unbaselined interface with hardware moving is the top risk."] },

{ id:"10.4", title:"Escapes and what you owe",
  card:[
    "An escape is a defect that got past the control and was found later, usually by hardware. It is the only configuration metric that cannot be improved by working faster, which is exactly why it is the one that matters.",
    "When one surfaces the order is fixed. Establish what is actually out there, from manufacturing and inspection records, not from the record that was wrong. Tell the customer honestly, including what you cannot establish. Then close the hole that let it through.",
    "Skipping the third step guarantees a fourth conversation. Rewriting the record to what it should have said is falsification, and it destroys the only evidence of what happened."
  ],
  example:{ kind:"event", level:4 },
  practice:{ kind:"event", level:4, n:2 },
  check:{ kind:"senior", level:5, n:2, pass:0.7 },
  keys:["Contain, report honestly, then fix the process. In that order.",
        "Reconstruct from manufacturing records, not from the bad record.",
        "Never rewrite a record to what it should have said."] },

{ id:"10.5", title:"Saying it out loud",
  card:[
    "Recognizing the right answer in a list is not the same as producing it in a room. This last lesson is the questions you will actually be asked, with the shape of a good answer.",
    "Answer in three beats: the rule, an example, and the caveat that the program tailors it in the CM plan. That third beat is what makes you sound like someone who has been near the work rather than someone who has read the standard.",
    "Say each answer out loud once before you move on. It is a different skill and it is the one being tested."
  ],
  quiz:[
    q("Best answer to: what makes a change Class I rather than Class II?",
      ["Name the trigger categories, give one concrete example, and note that only the contracting officer authorizes implementation",
       "Say it depends on the program",
       "List all thirteen triggers from memory with no example",
       "Say Class I is major and Class II is minor"], 0,
      "Rule, example, authority. Major and minor is the answer of someone who has not done it."),
    q("Best answer to: walk me through what you check before releasing a change package.",
      ["Walk the regions in order: title block, change control data, impact worksheet against the classification, approvals, effectivity against delivered units, then consistency with the vault",
       "Say you follow the checklist",
       "Describe the tool you would use",
       "Say you would ask the originator"], 0,
      "A structured walk shows you have a method. A checklist reference shows you have a document."),
    q("Best answer to: how would you answer a customer asking for the as built configuration of a serial number?",
      ["Describe the trace: notices released by that date, effectivity covering the unit, retrofit actually worked, highest revision among them, and state the extraction date",
       "Say you would run the monthly report",
       "Say you would ask engineering",
       "Give the current released revision"], 0,
      "The extraction date and the caveats are part of the answer. A number without a date is a rumour."),
    q("Best answer to: tell me about a time you found a problem in someone else's work.",
      ["A specific case, what you did, and how you raised it in a way that kept the working relationship",
       "Say you always follow the process",
       "Describe a problem you found and how wrong the other person was",
       "Say it has not come up"], 0,
      "This one is not about configuration management. It is the question people fail, and the answer is about how you handle being right.")
  ],
  check:{ kind:"quiz", n:4, pass:0.75 },
  keys:["Answer in three beats: rule, example, tailoring caveat.",
        "A structured walk beats naming a checklist.",
        "The behavioural question is the one people fail."] }
]}
];

/* flatten for navigation */
var LESSONS = [];
MODULES.forEach(function(m){ m.lessons.forEach(function(l){ l.module = m; LESSONS.push(l); }); });
function lessonIndex(id){ for (var i=0;i<LESSONS.length;i++) if (LESSONS[i].id === id) return i; return -1; }
function lessonById(id){ var i = lessonIndex(id); return i < 0 ? null : LESSONS[i]; }

window.BCTEACHC = { MODULES:MODULES, LESSONS:LESSONS, lessonIndex:lessonIndex, lessonById:lessonById };
})();
