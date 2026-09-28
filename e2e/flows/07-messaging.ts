import { supabaseAdmin } from "@/lib/supabase/admin";

export async function runMessagingFlow(
  userId: string,
  recipientId: string = "57d1bab1-1c10-45f8-8835-d1421cab8ca5"
): Promise<void> {
  console.log(`\n▶ [FLOW 7] Direct Messaging & Read Receipts Flow`);

  const messageText = `E2E automated chat message at ${new Date().toISOString()}`;

  // 1. Dispatch message from test user to recipient
  const { data: message, error: sendErr } = await supabaseAdmin
    .from("messages")
    .insert({
      sender_id: userId,
      receiver_id: recipientId,
      text: messageText,
      is_read: false,
    })
    .select("id, sender_id, receiver_id, text, is_read, created_at")
    .single();

  if (sendErr || !message) {
    throw new Error(`Failed to insert message into database: ${sendErr?.message}`);
  }
  console.log(`  ✓ Message successfully sent to recipient ${recipientId} (Message ID: ${message.id})`);

  // 2. Query conversation history between sender and receiver
  const { data: conversation, error: convErr } = await supabaseAdmin
    .from("messages")
    .select("id, sender_id, receiver_id, text, is_read")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${userId})`
    )
    .order("created_at", { ascending: false });

  if (convErr || !conversation) {
    throw new Error(`Failed to load conversation: ${convErr?.message}`);
  }

  const found = conversation.find((m) => m.id === message.id);
  if (!found || found.text !== messageText) {
    throw new Error(`Sent message not retrieved in conversation history! Found: ${JSON.stringify(found)}`);
  }
  console.log("  ✓ Conversation query retrieved message with accurate sender & payload");

  // 3. Mark message as read (simulating recipient opening thread)
  const { error: readErr } = await supabaseAdmin
    .from("messages")
    .update({ is_read: true })
    .eq("id", message.id);

  if (readErr) {
    throw new Error(`Failed to update message read receipt: ${readErr.message}`);
  }

  // 4. Verify read status is persisted
  const { data: verifiedMsg } = await supabaseAdmin
    .from("messages")
    .select("id, is_read")
    .eq("id", message.id)
    .single();

  if (!verifiedMsg?.is_read) {
    throw new Error("Message read receipt status was not updated to true");
  }
  console.log("  ✓ Read receipt successfully updated and verified in database");
}
