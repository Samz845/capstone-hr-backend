import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendInvitationEmail = async (
  recipientEmail,
  invitationLink,
  recipientName,
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: recipientEmail,
      subject: "You're Invited to Join Capstone Smartstart",
      html: `
               <div  style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
               <h2>Welcome to Capstone Smartstart</h2>
                <p>Hello ${recipientName},</p>
                <p>
                You've been invited to join Capstone Smartstart, a platform designed to streamline HR processes and enhance employee engagement.
                </p>

                <p>
                To accept the invitation and set up your account, please click the link below:
                </p>
                <a
            href="${invitationLink}"
            style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            Accept Invitation
          </a>
            <p>This invitation expires in 24 hours.</p>
            <p>If you weren't expecting this invitation, please ignore it.</p>
               </div>
            `,
    });

    if (error) {
      console.error("Error sending invitation email:", error);
      throw new Error(error.message || "Failed to send invitation email");
    }

    return data;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw new Error(error.message || "Failed to send invitation email");
  }
};
