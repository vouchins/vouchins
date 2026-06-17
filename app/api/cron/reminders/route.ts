import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendDmReminderEmail, sendCommentReminderEmail, getTargetNotificationEmail } from "@/lib/email-notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // 1. Verify CRON_SECRET authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    // 2. Fetch unread, unsent notifications
    const { data: notifications, error } = await supabaseAdmin
      .from("notifications")
      .select(`
        id,
        type,
        created_at,
        metadata,
        user_id,
        actor_id,
        entity_id,
        recipient:users!notifications_user_id_fkey(
          email,
          personal_email,
          last_seen,
          pref_email_messages,
          pref_email_comments,
          company:companies(domain)
        ),
        actor:users!notifications_actor_id_fkey(
          full_name,
          id
        )
      `)
      .is("email_sent_at", null)
      .eq("is_read", false);

    if (error) {
      console.error("Error fetching notifications for reminders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: "No notifications to process" });
    }

    // Filter notifications to process
    const dmsToSend: any[] = [];
    const commentsToSend: any[] = [];

    for (const notif of notifications) {
      const createdAt = new Date(notif.created_at);
      const recipient = notif.recipient as any;
      const actor = notif.actor as any;

      if (!recipient) continue;
      const targetEmail = getTargetNotificationEmail(recipient);
      if (!targetEmail) continue;

      const lastSeen = recipient.last_seen ? new Date(recipient.last_seen) : null;
      const hasNotSeen = !lastSeen || lastSeen < createdAt;

      if (notif.type === "MESSAGE_RECEIVED") {
        if (createdAt <= twoHoursAgo && recipient.pref_email_messages && hasNotSeen) {
          dmsToSend.push({
            notificationId: notif.id,
            to: targetEmail,
            actorName: actor?.full_name || "Someone",
            actorId: notif.actor_id,
          });
        }
      } else if (notif.type === "COMMENT_RECEIVED" || notif.type === "COMMENT_REPLY") {
        if (createdAt <= sixHoursAgo && recipient.pref_email_comments && hasNotSeen) {
          commentsToSend.push({
            notificationId: notif.id,
            to: targetEmail,
            actorName: actor?.full_name || "Someone",
            isReply: notif.type === "COMMENT_REPLY",
            postId: notif.metadata?.post_id,
            commentId: notif.entity_id,
          });
        }
      }
    }

    const processedIds: string[] = [];

    // Send DM reminders
    for (const dm of dmsToSend) {
      try {
        await sendDmReminderEmail(dm.to, dm.actorName, dm.actorId);
        processedIds.push(dm.notificationId);
      } catch (err) {
        console.error(`Failed to send DM email for notification ${dm.notificationId}:`, err);
      }
    }

    // Send Comment/Reply reminders
    if (commentsToSend.length > 0) {
      // Fetch post titles in batch
      const postIds = Array.from(new Set(commentsToSend.map(c => c.postId).filter(Boolean)));
      let postTitleMap = new Map<string, string>();
      if (postIds.length > 0) {
        const { data: posts } = await supabaseAdmin
          .from("posts")
          .select("id, title")
          .in("id", postIds);
        postTitleMap = new Map(posts?.map((p: any) => [p.id, p.title]) || []);
      }

      for (const comment of commentsToSend) {
        try {
          const postTitle = postTitleMap.get(comment.postId) || "a post";
          await sendCommentReminderEmail(
            comment.to,
            comment.actorName,
            postTitle,
            comment.isReply,
            comment.postId,
            comment.commentId
          );
          processedIds.push(comment.notificationId);
        } catch (err) {
          console.error(`Failed to send comment email for notification ${comment.notificationId}:`, err);
        }
      }
    }

    // 3. Batch update notifications as email sent
    if (processedIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("notifications")
        .update({ email_sent_at: now.toISOString() })
        .in("id", processedIds);

      if (updateError) {
        console.error("Error updating notifications email_sent_at:", updateError);
        return NextResponse.json({ error: "Failed to update notification records" }, { status: 500 });
      }
    }

    return NextResponse.json({
      message: `Processed reminders successfully`,
      sentDms: dmsToSend.length,
      sentComments: commentsToSend.length,
      updatedNotifications: processedIds.length,
    });
  } catch (error: any) {
    console.error("Error in reminders cron route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
