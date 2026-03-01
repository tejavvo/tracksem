import { seedByBranch } from "$lib/server/db";
import { getCourses } from "$lib/data/courses";
import { json } from "@sveltejs/kit";

import type { RequestHandler } from "./$types";

/** POST /api/courses/seed  → seed courses from catalog for a branch + semester */
export const POST: RequestHandler = async ({ request, locals }) => {
  const {
    data: { user },
  } = await locals.supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const { branch, semester } = await request.json();
  const coursesRequired = getCourses(branch, semester);
  if (coursesRequired.length === 0) {
    return json(
      {
        error:
          "No courses found for this branch and this semester. Please contact Teja Pudi :-)",
      },
      { status: 400 },
    );
  }
  const courses = await seedByBranch(locals.supabase, user.id, coursesRequired);

  return json(courses);
};
