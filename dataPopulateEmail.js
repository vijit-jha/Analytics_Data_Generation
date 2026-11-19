
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
    scenarios: {
        social_api_load: {
            executor: 'constant-vus',
            vus: 10,
            duration: '15m',
            gracefulStop: '30s'
        }
    },

    thresholds: {
        dropped_iterations: ['count==0']
    }
};

const URL = 'https://social-qa.netomi.com/v1/webhook';

const HEADERS = {
    'Content-Type': 'application/json',
    'X_INTEGRATION': 'ZENDESK',
    'x-channel': 'EMAIL'
};

const BOT_REFERENCE_ID =
    '3127583b-0210-40b1-a372-6716f476ae8a';

const USER_QUERIES = [
    'Can Delta assist with emergencies during travel?',
    'Are there restrictions on the type of pets allowed onboard?',
    'How big can the pet carrier be to fit under the seat?',
    'Can I sit in the exit row and can I get a wheelchair at the airport?',
    'How can I upgrade my seating class while booking?',
    'How can I add a meal to my trip?',
    'When does web check-in start before flight departure?',
    'How can I request a wheelchair at the airport?',
    'I need to file a refund for an earlier flight.',
    'I had a death in my family and need help booking a ticket.',
    'What is the process for booking a pet on my reservation?',
    'Can I redeem SkyMiles to cover my baggage fees?',
    'How do I add missing miles to my account?',
    'Can I book a separate seat for my infant?',
    'Can I pay cash to upgrade my seat after purchasing my ticket?',
    'I want to report a problem with my last trip.',
    'What are the baggage allowance rules?',
    'How can I change my flight?',
    'How do I cancel my reservation?',
    'What documents are required for international travel?'
];

const EMAIL = 'akash.tyagi@netomi.com';
const RUN_ID = Date.now();

export default function () {

    // Generate unique identifiers across all VUs
    const id = `${RUN_ID}_${__VU}_${__ITER}`;

    const ticketId =
        `2026-11-16-${String(__VU).padStart(4, '0')}-${String(__ITER).padStart(8, '0')}`;

    // Select queries cyclically
    const queryIndex =
        ((__VU - 1) + __ITER) % USER_QUERIES.length;

    const selectedQuery = USER_QUERIES[queryIndex];

    // Prepare EMAIL webhook payload
    const payload = {
        type: 'ai.msg.domain.requests.agentdesk.ZenDeskChannelRequest',
        caseStatus: 'New',
        subject: '',
        ticketId: ticketId,
        eventType: 'user_message',
        ticketOwnerType: 'AI',
        timestamp: Math.floor(Date.now() / 1000),

        user: {
            emailId: EMAIL,
            firstName: 'Akash',
            lastName: 'Tyagi'
        },

        userMessage: selectedQuery,

        botReferenceId: BOT_REFERENCE_ID,

        listOfAttachments: [
            {
                type: 'ai.msg.domain.responses.core.Email',
                to: null,
                bcc: null,
                body: '',
                cc: null,
                from: EMAIL,
                attachmentUrls: [],
                subject: '9910011912',
                threadId: id
            }
        ]
    };

    // Trigger webhook
    const response = http.post(
        URL,
        JSON.stringify(payload),
        {
            headers: HEADERS,
            timeout: '60s'
        }
    );

    // Validate response
    const passed = check(response, {
        'HTTP status is 2xx': (r) =>
            r.status >= 200 && r.status < 300
    });

    if (passed) {
        successfulRequests.add(1);
    } else {
        failedRequests.add(1);

        console.error(
            `FAILED | VU: ${__VU} | Ticket: ${ticketId} | Query: ${selectedQuery} | Status: ${response.status} | Body: ${response.body}`
        );
    }
}


