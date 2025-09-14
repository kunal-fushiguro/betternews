import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { userTable } from "./auth";
import { commentsTable } from "./comments";
import { postsTable } from "./posts";

export const postUpvoteTable = pgTable("post_upvote", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  postId: integer("post_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const postUpvoteRelations = relations(postUpvoteTable, ({ one }) => ({
  post: one(postsTable, {
    fields: [postUpvoteTable.postId],
    references: [postsTable.id],
    relationName: "postUpvotes",
  }),
  user: one(userTable, {
    fields: [postUpvoteTable.userId],
    references: [userTable.id],
    relationName: "user",
  }),
}));

export const commentsUpvoteTable = pgTable("comments_post_upvote", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  commentId: integer("comment_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const commentsUpvoteRelations = relations(
  commentsUpvoteTable,
  ({ one }) => ({
    post: one(commentsTable, {
      fields: [commentsUpvoteTable.commentId],
      references: [commentsTable.id],
      relationName: "commentUpvotes",
    }),
    user: one(userTable, {
      fields: [commentsUpvoteTable.userId],
      references: [userTable.id],
      relationName: "user",
    }),
  }),
);
