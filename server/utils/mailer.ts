import nodemailer from 'nodemailer'

export const sendNotification = async (subject: string, text: string) => {
  const config = useRuntimeConfig()
  
  // Use environment variables for SMTP config
  // Defaults to local SMTP on port 25
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '25'),
    secure: false, // true for 465, false for other ports
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  })

  const mailOptions = {
    from: '"YouTube Agent" <no-reply@localhost>',
    to: process.env.NOTIFICATION_EMAIL || 'bedri@localhost',
    subject,
    text
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Notification sent: %s', info.messageId)
    return info
  } catch (error) {
    console.error('Error sending notification:', error)
    throw error
  }
}
