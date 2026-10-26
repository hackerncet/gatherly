import { aiPlanSchema, type Brief, type Plan } from "./schemas.ts";
export function allocateBudget(
  total: number,
  weights: readonly (readonly [string, number])[],
) {
  let used = 0;
  return weights.map(([category, percent], i) => {
    const amount =
      i === weights.length - 1
        ? total - used
        : Math.floor((total * percent) / 100);
    used += amount;
    return { category, amount };
  });
}
interface Template {
  weights: [string, number][];
  tasks: [string, number, string][];
  ideas: [string, string, string][];
}
const templateData: Record<Brief["type"], Template> = {
  wedding: {
    weights: [
      ["Venue & catering", 40],
      ["Decor & flowers", 15],
      ["Photography", 12],
      ["Outfits & beauty", 10],
      ["Music & entertainment", 8],
      ["Invitations & gifts", 5],
      ["Contingency", 10],
    ],
    tasks: [
      ["Set your priorities together", 120, "Planning"],
      ["Shortlist and visit venues", 100, "Venue"],
      ["Book catering and ask about dietary needs", 75, "Catering"],
      ["Choose your photographer", 60, "Photography"],
      ["Send invitations and collect RSVPs", 45, "Guests"],
      ["Confirm decor, music and the ceremony plan", 30, "Vendors"],
      ["Finalize guest count and seating", 10, "Guests"],
      ["Confirm arrival times with every vendor", 7, "Vendors"],
      ["Prepare a day-of essentials kit", 2, "Planning"],
    ],
    ideas: [
      [
        "A table full of stories",
        "Give each table a name inspired by a place or memory you share. Add a short note so your guests feel part of the story.",
        "Personal touch",
      ],
      [
        "Locally grown, beautifully gathered",
        "Seasonal flowers and reusable vessels create a thoughtful setting. Ask your florist what is local and in season.",
        "Mindful celebration",
      ],
      [
        "A welcome worth remembering",
        "Set up a welcome drink station with clear ingredient labels and an alcohol-free option for everyone.",
        "Guest experience",
      ],
    ],
  },
  birthday: {
    weights: [
      ["Venue & food", 40],
      ["Decor & theme", 15],
      ["Cake & desserts", 12],
      ["Activities", 13],
      ["Invitations & gifts", 10],
      ["Contingency", 10],
    ],
    tasks: [
      ["Choose a theme and guest list", 30, "Planning"],
      ["Reserve a venue or plan the space", 25, "Venue"],
      ["Send invitations", 21, "Guests"],
      ["Book the cake and food", 14, "Catering"],
      ["Plan games and a music playlist", 10, "Activities"],
      ["Check dietary needs and RSVPs", 7, "Guests"],
      ["Prepare decorations and party kits", 3, "Decor"],
      ["Confirm deliveries and setup", 1, "Vendors"],
    ],
    ideas: [
      [
        "The memory wall",
        "Invite guests to bring a favorite photo or write a short memory. Turn the collection into a keepsake after the party.",
        "Personal touch",
      ],
      [
        "A make-your-own moment",
        "Try a cupcake decorating or mocktail station with allergy labels. It doubles as an activity and a treat.",
        "Interactive",
      ],
      [
        "A celebration that feels like you",
        "Build a playlist around favorite years, songs and inside jokes. Leave a few slots for guest requests.",
        "Atmosphere",
      ],
    ],
  },
  community: {
    weights: [
      ["Venue & permits", 25],
      ["Food & refreshments", 25],
      ["Equipment & sound", 15],
      ["Activities & materials", 15],
      ["Outreach & signage", 10],
      ["Contingency", 10],
    ],
    tasks: [
      ["Define the purpose and form a volunteer team", 60, "Planning"],
      ["Check venue access and permit requirements", 45, "Venue"],
      ["Build a safety and accessibility plan", 40, "Safety"],
      ["Confirm food and equipment suppliers", 30, "Vendors"],
      ["Publish invitations and registration details", 21, "Guests"],
      ["Assign volunteer roles and shifts", 14, "Volunteers"],
      ["Confirm an indoor or bad-weather backup", 7, "Safety"],
      ["Brief volunteers and check access routes", 1, "Volunteers"],
    ],
    ideas: [
      [
        "A neighborhood talent corner",
        "Make room for short performances, local makers and community groups. Offer a simple sign-up with clear time slots.",
        "Connection",
      ],
      [
        "Everyone has a place",
        "Provide step-free access, a quiet area, clear signage and seating near activities. Ask attendees about access needs.",
        "Inclusion",
      ],
      [
        "A lighter footprint",
        "Use refill stations and clearly marked waste bins. Share public transport directions and bring-your-own bottle reminders.",
        "Sustainability",
      ],
    ],
  },
};
export function starterPlan(brief: Brief): Plan {
  const t = templateData[brief.type];
  const preferences = brief.preferences.toLowerCase();
  const tailored: Plan["ideas"] = [];
  const extraTasks: Plan["tasks"] = [];
  if (/access|wheelchair|step.free|inclusive|quiet|sensory/.test(preferences)) {
    tailored.push({
      title: "A welcome everyone can use",
      detail:
        "Confirm step-free routes and accessible toilets with the venue. Offer quiet seating, clear signs and a way for guests to share access needs privately.",
      tag: "Accessibility",
    });
    extraTasks.push({
      title: "Confirm step-free routes, accessible toilets and quiet seating",
      daysBefore: 14,
      category: "Accessibility",
    });
  }
  if (/vegan|vegetarian|allerg|dietary|gluten/.test(preferences)) {
    tailored.push({
      title: "A menu with clear choices",
      detail:
        "Request suitable vegetarian or vegan choices, label ingredients and ask the caterer about allergen cross-contact. Confirm individual needs directly with guests.",
      tag: "Food & inclusion",
    });
    extraTasks.push({
      title: "Confirm dietary options, ingredient labels and allergen handling",
      daysBefore: 10,
      category: "Catering",
    });
  }
  if (/outdoor|garden|rain|weather/.test(preferences)) {
    tailored.push({
      title: "A ready-to-use weather backup",
      detail:
        "Agree on an indoor or sheltered alternative, a decision time and a clear way to notify guests. Check shade, drinking water and safe access routes.",
      tag: "Weather plan",
    });
    extraTasks.push({
      title: "Confirm the weather backup and decision contact",
      daysBefore: 7,
      category: "Safety",
    });
  }
  if (/eco|sustain|low.waste|reus|local/.test(preferences)) {
    tailored.push({
      title: "Less waste, more intention",
      detail:
        "Use reusable decor, refill water stations and clearly marked waste bins. Coordinate leftover food and transport arrangements with the venue.",
      tag: "Sustainability",
    });
  }
  const ideas = [
    ...tailored,
    ...t.ideas.map(([title, detail, tag]) => ({ title, detail, tag })),
  ].slice(0, 5);
  return aiPlanSchema.parse({
    summary: `A starting point for ${brief.title}: ${brief.guests} guests in ${brief.location}. Protect a 10% contingency and confirm local quotes. ${brief.preferences ? `Your preferences: ${brief.preferences.slice(0, 950)}. ` : ""}These are editable planning estimates, not vendor quotes.`,
    budgets: allocateBudget(brief.budget, t.weights),
    tasks: [
      ...t.tasks.map(([title, daysBefore, category]) => ({
        title,
        daysBefore,
        category,
      })),
      ...extraTasks,
    ],
    ideas,
    vendors: t.weights
      .filter(([category]) => category !== "Contingency")
      .slice(0, 4)
      .map(([category]) => ({
        category,
        requirements: `Collect a written quote, confirm availability, review cancellation terms and confirm ${category.toLowerCase()} requirements, including relevant access and dietary needs.`,
      })),
  });
}
