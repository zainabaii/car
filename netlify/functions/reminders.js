// Netlify Serverless Function: Service Reminders Management API

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    const defaultReminders = [
      {
        id: 'rem-1',
        title: 'Next Oil Service',
        targetKm: '15,000 KM',
        remainingKm: '2,550 KM',
        status: 'UPCOMING',
        category: 'Engine',
        dueDate: 'Oct 24, 2026'
      },
      {
        id: 'rem-2',
        title: 'Brake Pad & Rotor Inspection',
        targetKm: '20,000 KM',
        remainingKm: '7,550 KM',
        status: 'SCHEDULED',
        category: 'Safety',
        dueDate: 'Dec 15, 2026'
      },
      {
        id: 'rem-3',
        title: 'General Vehicle Health Inspection',
        targetKm: '25,000 KM',
        remainingKm: '12,550 KM',
        status: 'PLANNED',
        category: 'Inspection',
        dueDate: 'Feb 10, 2027'
      }
    ];

    if (event.httpMethod === 'POST' && payload.newReminder) {
      const newRem = {
        id: `rem-${Date.now()}`,
        title: payload.newReminder.title || 'Custom Service Reminder',
        targetKm: payload.newReminder.targetKm || '5,000 KM',
        remainingKm: payload.newReminder.remainingKm || '5,000 KM',
        status: 'UPCOMING',
        category: payload.newReminder.category || 'General',
        dueDate: payload.newReminder.dueDate || 'Next Month'
      };
      defaultReminders.unshift(newRem);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reminders: defaultReminders,
        disclaimer: 'Actual service intervals depend on vehicle manufacturer guidelines, driving environment, and physical condition.'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}
