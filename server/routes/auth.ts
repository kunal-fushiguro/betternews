import { db } from "@/adapter";
import type { Context } from "@/context";
import { userTable } from "@/db/schemas/auth";
import { lucia } from "@/lucia";
import { loggedIn } from "@/middleware/loggedIn";
import { loginSchema, type SuccessResponse } from "@/shared/types";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { generateId } from "lucia";
import postgres from "postgres";

export const authRouter = new Hono<Context>()
  .post("/signup", zValidator("form", loginSchema), async (c) => {
    const { password, username } = c.req.valid("form");
    const passwordHash = await Bun.password.hash(password);
    const userId = generateId(15);

    try {
      await db.insert(userTable).values({
        id: userId,
        username,
        password_hash: passwordHash,
      });

      const session = await lucia.createSession(userId, { username });
      const sessionCookie = lucia.createSessionCookie(session.id).serialize();
      c.header("Set-Cookie", sessionCookie, { append: true });

      return c.json<SuccessResponse>(
        {
          success: true,
          message: "User Created Successfully",
        },
        201,
      );
    } catch (err) {
      if (err instanceof postgres.PostgresError && err.code === "23505") {
        throw new HTTPException(409, { message: "Username already used" });
      }

      throw new HTTPException(500, { message: "Failed to create User" });
    }
  })
  .post("/login", zValidator("form", loginSchema), async (c) => {
    const { password, username } = c.req.valid("form");
    const [existingUser] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.username, username))
      .limit(1);

    if (existingUser === undefined) {
      throw new HTTPException(401, {
        message: "Incorrect username",
      });
    }

    const validPassword = await Bun.password.verify(
      password,
      existingUser.password_hash,
    );
    if (validPassword === false) {
      throw new HTTPException(401, {
        message: "Incorrect username or password",
      });
    }

    const session = await lucia.createSession(existingUser.id, { username });
    const sessionCookie = lucia.createSessionCookie(session.id).serialize();
    c.header("Set-Cookie", sessionCookie, { append: true });

    return c.json<SuccessResponse>(
      {
        success: true,
        message: "User Login Successfully",
      },
      200,
    );
  })
  .get("/logout", async (c) => {
    const session = c.get("session");
    if (session === null) {
      return c.redirect("/");
    }

    await lucia.invalidateSession(session.id);
    c.header("Set-Cookie", lucia.createBlankSessionCookie().serialize());
    return c.redirect("/");
  })
  .get("/user", loggedIn, async (c) => {
    const user = c.get("user")!;
    return c.json<SuccessResponse<{ username: string }>>({
      success: true,
      message: "User Fetched Successfully",
      data: {
        username: user.username,
      },
    });
  });
