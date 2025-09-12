const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');
const moment = require('moment');

// Don't run cron jobs during testing
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    scheduleReminders: () => {}
  };
} else {
  // Configure email transport
  const transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });

  // Parse reminder schedule from environment variable
  const parseReminderSchedule = () => {
    const schedule = process.env.REMINDER_SCHEDULE || '24h before,1h before,10m before';
    return schedule.split(',').map(s => s.trim());
  };

  const sendEmailReminder = async (appointment, recipient, subject, body) => {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'no-reply@arogyam.com',
        to: recipient.email,
        subject: subject,
        text: body
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`Email reminder sent to ${recipient.email} for appointment ${appointment._id}`);
    } catch (error) {
      console.error('Error sending email reminder:', error);
    }
  };

  const createReminderNotifications = async () => {
    try {
      console.log('Running appointment reminder job...');
      
      const reminderTimes = parseReminderSchedule();
      const now = moment();
      
      // For each reminder time, find appointments that match
      for (const reminderTime of reminderTimes) {
        let timeOffset;
        
        if (reminderTime.includes('h before')) {
          const hours = parseInt(reminderTime.replace('h before', ''));
          timeOffset = moment().add(hours, 'hours');
        } else if (reminderTime.includes('m before')) {
          const minutes = parseInt(reminderTime.replace('m before', ''));
          timeOffset = moment().add(minutes, 'minutes');
        } else {
          console.log(`Invalid reminder time format: ${reminderTime}`);
          continue;
        }
        
        // Find appointments that start at the reminder time
        const startTime = timeOffset.startOf('minute').toDate();
        const endTime = moment(startTime).endOf('minute').toDate();
        
        const appointments = await Appointment.find({
          startAt: {
            $gte: startTime,
            $lte: endTime
          },
          status: 'confirmed'
        }).populate('patientId').populate('consultantId');
        
        console.log(`Found ${appointments.length} appointments for reminder: ${reminderTime}`);
        
        // Create notifications for each appointment
        for (const appointment of appointments) {
          // Notification for patient
          const patientNotification = new Notification({
            userId: appointment.patientId._id,
            type: 'appointment_reminder',
            title: 'Appointment Reminder',
            body: `Your appointment with ${appointment.consultantId.email} is starting soon.`,
            meta: { appointmentId: appointment._id }
          });
          
          // Notification for consultant
          const consultantNotification = new Notification({
            userId: appointment.consultantId._id,
            type: 'appointment_reminder',
            title: 'Appointment Reminder',
            body: `Your appointment with ${appointment.patientId.email} is starting soon.`,
            meta: { appointmentId: appointment._id }
          });
          
          await Promise.all([
            patientNotification.save(),
            consultantNotification.save()
          ]);
          
          // Send email reminders
          await sendEmailReminder(
            appointment,
            appointment.patientId,
            'Appointment Reminder',
            `Your appointment with ${appointment.consultantId.email} is starting soon.`
          );
          
          await sendEmailReminder(
            appointment,
            appointment.consultantId,
            'Appointment Reminder',
            `Your appointment with ${appointment.patientId.email} is starting soon.`
          );
        }
      }
      
      console.log('Appointment reminder job completed.');
    } catch (error) {
      console.error('Error in appointment reminder job:', error);
    }
  };

  // Schedule the job to run every minute
  const scheduleReminders = () => {
    // Run every minute
    cron.schedule('* * * * *', createReminderNotifications);
    console.log('Appointment reminder job scheduled to run every minute.');
  };

  module.exports = {
    scheduleReminders
  };
}