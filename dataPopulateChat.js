
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
    scenarios: {
        social_api_load: {
            executor: 'constant-vus',
            vus: 1,
            duration: '2m',
            gracefulStop: '30s'
        }
    },

    thresholds: {
        dropped_iterations: ['count==0']
    }
};

// API Configuration
const URL = 'https://social-qa.netomi.com/v1/webhook';

const BOT_REFERENCE_ID =
    'a21d4252-7396-4784-81f0-1d0bb4bba8e7';

const USER_ID =
    'a6018160-6e33-11f1-99a5-cfdaee32bd44';

const HEADERS = {
    'Content-Type': 'application/json',
    'x_integration': 'NETOMI_WEB_WIDGET',
    'x-channel': 'CHAT',
    'x-bot-ref-id': BOT_REFERENCE_ID,
    'env': 'SANDBOX'
};

// Test queries loaded from JSON
const USER_QUERIES = JSON.parse(open('./user_queries.json')).user_queries;

const RUN_ID = Date.now();

export default function () {

    // Generate unique identifiers across VUs and iterations
    const id = `${RUN_ID}_${__VU}_${__ITER}`;

    const conversationId =
        `2026-11-16-${String(__VU).padStart(4, '0')}-${String(__ITER).padStart(8, '0')}`;

    // Select queries sequentially; the single VU increments __ITER once per request
    const queryIndex = __ITER % USER_QUERIES.length;

    const selectedQuery = USER_QUERIES[queryIndex];

    // Prepare CHAT webhook payload
    const payload = {
        conversationId: conversationId,

        ownerType: 'BOT',

        messagePayload: {
            text: selectedQuery,
            label: '',
            messageId: id,
            timestamp: Date.now()
        },

        userDetails: {
            userId: USER_ID,
            emailId: ''
        },

        additionalAttributes: {
            CUSTOM_ATTRIBUTES: [
                {
                    type: 'TEXT',
                    name: 'widget_id',
                    value: null,
                    scope: 'LIFE_TIME'
                },
                {
                    type: 'TEXT',
                    name: 'visitor_url',
                    value: 'https://aistudio-qa.netomi.com/preview?botRefId=87a91f49-7f2d-463e-b1ef-2e9c2d97255d&src=https%3A%2F%2Fchatapps-qa.netomi.com',
                    scope: 'LIFE_TIME'
                },
                {
                    type: 'TEXT',
                    name: 'current_user_agent',
                    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
                    scope: 'LIFE_TIME'
                },
                {
                    type: 'TEXT',
                    name: 'current_device_type',
                    value: 'desktop',
                    scope: 'LIFE_TIME'
                },
                {
                    type: 'TEXT',
                    name: 'current_platform',
                    value: 'Windows Os',
                    scope: 'LIFE_TIME'
                },
                {
                    type: 'TEXT',
                    name: 'ip_address',
                    value: '2401:4900:1c45:e466:8c91:f18b:6cc8:8038',
                    scope: 'LIFE_TIME'
                },
                {
                    type: 'TEXT',
                    name: 'generated_by',
                    value: 'USER',
                    scope: 'LIFE_TIME'
                }
            ]
        }
    };

    // Trigger CHAT webhook
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
            `FAILED | VU: ${__VU} | Conversation: ${conversationId} | Query: ${selectedQuery} | Status: ${response.status} | Body: ${response.body}`
        );
    }
}
