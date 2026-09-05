'use strict';


const fs = require('fs');
const path = require('path');
const config = require('../src/config/config');

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');


// ============================================================
// CONFIG
// ============================================================

const BOT_BASE_DIR =
    config.paths.base;

const BASE_DIR =
    __dirname;

const GROUP_FILE =
    path.join(
        BASE_DIR,
        'groups',
        'group_name.txt'
    );

const LOG_DIR =
    path.join(
        BASE_DIR,
        'logs'
    );

const LOG_FILE =
    path.join(
        LOG_DIR,
        'group-message-control.log'
    );

const AUTH_PATH =
    config.paths.auth;

const CLIENT_ID =
    'group-message-control';

const TIMEZONE =
    config.timezone;


// ============================================================
// ANNOUNCEMENTS
// ============================================================

const ANNOUNCEMENTS = {

    start:
`📢 ग्रुप सुरू झाला आहे.

ग्रुप आता खुला आहे.
कृपया आपले फोटो पोस्ट करा.

📢 Group is open.

The group is now open.
Please post your photos.

धन्यवाद / Thank you.`,

    warning1:
`⚠️ महत्वाची सूचना / Important Notice

ग्रुप रात्री 11:00 वाजता बंद होणार आहे.
ग्रुप बंद होण्यासाठी आता 1 तास बाकी आहे.

⚠️ The group will close at 11:00 PM.
The group will close in 1 hour.

कृपया आपले आवश्यक संदेश वेळेत पाठवा.
Please send your required messages before the group closes.`,

    warning2:
`⚠️ अंतिम सूचना / Final Notice

ग्रुप रात्री 11:00 वाजता बंद होणार आहे.
ग्रुप बंद होण्यासाठी आता फक्त 15 मिनिटे बाकी आहेत.

⚠️ The group will close at 11:00 PM.
The group will close in only 15 minutes.

कृपया आपले आवश्यक संदेश आता पाठवा.
Please send your required messages now.`,

    close:
`🔒 ग्रुप बंद करण्यात आला आहे.

ग्रुप आता बंद आहे.
कृपया आता फोटो पोस्ट करू नका.

🔒 Group is closed.

The group is now closed.
Please do not post photos now.

धन्यवाद / Thank you.`
};


// ============================================================
// LOGGING
// ============================================================

function log(message) {

    fs.mkdirSync(
        LOG_DIR,
        {
            recursive: true
        }
    );

    const now =
        new Date();

    const timestamp =
        new Intl.DateTimeFormat(
            'en-GB',
            {
                timeZone: TIMEZONE,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hourCycle: 'h23'
            }
        ).format(now);

    const line =
        `[${timestamp}] ${message}`;

    console.log(line);

    fs.appendFileSync(
        LOG_FILE,
        line + '\n'
    );
}


// ============================================================
// LOAD GROUP NAMES
// ============================================================

function loadGroupNames() {

    if (!fs.existsSync(GROUP_FILE)) {

        throw new Error(
            `Group file not found: ${GROUP_FILE}`
        );
    }

    const groups =
        fs.readFileSync(
            GROUP_FILE,
            'utf8'
        )
        .split(/\r?\n/)
        .map(
            line => line.trim()
        )
        .filter(Boolean)
        .filter(
            line =>
                !line.startsWith('#')
        );

    if (!groups.length) {

        throw new Error(
            `No group names found in ${GROUP_FILE}`
        );
    }

    log(
        `Loaded ${groups.length} group names.`
    );

    return groups;
}


// ============================================================
// CLIENT / WHATSAPP STARTUP CONTROL
// ============================================================

const QR_TIMEOUT_MS =
    120000;

const READY_TIMEOUT_MS =
    120000;

const MAX_STARTUP_ATTEMPTS =
    3;

let client = null;

const AUTH_SESSION_PATH =
    path.join(
        AUTH_PATH,
        `session-${CLIENT_ID}`
    );

function createClient() {

    const instance =
        new Client({

            authStrategy:
                new LocalAuth({

                    dataPath:
                        AUTH_PATH,

                    clientId:
                        CLIENT_ID
                }),

            puppeteer: {

                headless: true,

                args: [

                    '--no-sandbox',

                    '--disable-setuid-sandbox',

                    '--disable-dev-shm-usage',

                    '--disable-gpu'

                ]
            }
        });

    return instance;
}


async function safeDestroyClient() {

    if (!client) {
        return;
    }

    const currentClient =
        client;

    client =
        null;

    try {

        await currentClient.destroy();

    } catch (error) {

        log(
            `CLIENT DESTROY WARNING | ${
                error && error.message
                    ? error.message
                    : error
            }`
        );
    }
}


function quarantineAuthSession() {

    if (
        !fs.existsSync(
            AUTH_SESSION_PATH
        )
    ) {

        log(
            'AUTH SESSION RESET | Session directory does not exist.'
        );

        return null;
    }

    const quarantineRoot =
        path.join(
            AUTH_PATH,
            'invalid-sessions'
        );

    fs.mkdirSync(
        quarantineRoot,
        {
            recursive: true
        }
    );

    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                '-'
            );

    const quarantinePath =
        path.join(
            quarantineRoot,
            `session-${CLIENT_ID}-invalid-${timestamp}`
        );

    fs.renameSync(
        AUTH_SESSION_PATH,
        quarantinePath
    );

    log(
        `AUTH SESSION QUARANTINED | ${quarantinePath}`
    );

    return quarantinePath;
}


// ============================================================
// FIND GROUP DIRECTLY
//
// IMPORTANT:
// Do NOT use:
//   client.getChats()
//   client.getChatById()
//
// They fail in this environment.
//
// We directly access WAWebCollections.Chat.
// ============================================================


async function findGroupDirectly(
    groupName
) {

    const result =
        await client.pupPage.evaluate(
            (targetName) => {

                const chats =
                    window
                        .require('WAWebCollections')
                        .Chat
                        .getModelsArray();

                const chat =
                    chats.find(
                        c =>
                            c.formattedTitle ===
                            targetName
                    );

                if (!chat) {

                    return null;
                }

                return {

                    id:
                        chat.id?._serialized || null,

                    name:
                        chat.formattedTitle || null,

                    isGroup:
                        !!chat.groupMetadata
                };
            },
            groupName
        );

    return result;
}


// ============================================================
// SET ADMIN-ONLY DIRECTLY
//
// enabled = false
//     Members + admins can send
//
// enabled = true
//     Only admins can send
//
// IMPORTANT:
// Use WWebJS.getChat() with getAsModel=false before calling
// WAWebSetPropertyGroupAction.
//
// This matches the current whatsapp-web.js implementation and
// avoids passing the raw WAWebCollections model directly.
// ============================================================

async function setAdminOnly(
    groupId,
    enabled,
    groupName
) {

    const result =
        await client.pupPage.evaluate(
            async (
                targetGroupId,
                adminOnly
            ) => {

                try {

                    const chat =
                        await window.WWebJS.getChat(
                            targetGroupId,
                            {
                                getAsModel: false
                            }
                        );

                    if (!chat) {

                        return {
                            success: false,
                            diagnostic: {
                                stage: 'GET_CHAT',
                                name: 'ChatNotFound',
                                message:
                                    `WhatsApp chat not found: ${targetGroupId}`,
                                stack: null,
                                constructor: null
                            }
                        };
                    }

                    try {

                        await window
                            .require(
                                'WAWebSetPropertyGroupAction'
                            )
                            .setGroupProperty(
                                chat,
                                'announcement',
                                adminOnly ? 1 : 0
                            );

                        return {
                            success: true,
                            reason: null,
                            diagnostic: null
                        };

                    } catch (error) {

                        let name = null;
                        let message = null;
                        let stack = null;
                        let constructor = null;

                        try {
                            name = error?.name ?? null;
                        } catch (_) {}

                        try {
                            message = error?.message ?? String(error);
                        } catch (_) {
                            message = String(error);
                        }

                        try {
                            stack = error?.stack ?? null;
                        } catch (_) {}

                        try {
                            constructor =
                                error?.constructor?.name ?? null;
                        } catch (_) {}

                        if (
                            name ===
                            'ServerStatusCodeError'
                        ) {

                            return {
                                success: false,
                                reason:
                                    'ServerStatusCodeError',
                                diagnostic: {
                                    stage: 'SET_GROUP_PROPERTY',
                                    name,
                                    message,
                                    stack,
                                    constructor
                                }
                            };
                        }

                        return {
                            success: false,
                            reason: 'WHATSAPP_INTERNAL_ERROR',
                            diagnostic: {
                                stage: 'SET_GROUP_PROPERTY',
                                name,
                                message,
                                stack,
                                constructor
                            }
                        };
                    }

                } catch (error) {

                    let name = null;
                    let message = null;
                    let stack = null;
                    let constructor = null;

                    try {
                        name = error?.name ?? null;
                    } catch (_) {}

                    try {
                        message = error?.message ?? String(error);
                    } catch (_) {
                        message = String(error);
                    }

                    try {
                        stack = error?.stack ?? null;
                    } catch (_) {}

                    try {
                        constructor =
                            error?.constructor?.name ?? null;
                    } catch (_) {}

                    return {
                        success: false,
                        reason: 'BROWSER_CONTEXT_ERROR',
                        diagnostic: {
                            stage: 'BROWSER_CONTEXT',
                            name,
                            message,
                            stack,
                            constructor
                        }
                    };
                }

            },
            groupId,
            enabled
        );


    if (
        !result ||
        result.success !== true
    ) {

        log(
            `ADMIN ONLY DIAGNOSTIC | ${groupName} | ${
                result?.reason || 'UNKNOWN'
            } | ${
                result?.diagnostic
                    ? JSON.stringify(result.diagnostic)
                    : 'NO_DIAGNOSTIC'
            }`
        );

        throw new Error(
            `Failed to change admin-only setting: ${groupName}${
                result &&
                result.reason
                    ? ` | ${result.reason}`
                    : ''
            }`
        );
    }


    log(
        `ADMIN ONLY ${
            enabled
                ? 'ON'
                : 'OFF'
        } | ${groupName}`
    );

    return true;
}


// ============================================================
// SEND MESSAGE DIRECTLY
// ============================================================

async function sendAnnouncement(
    groupId,
    message,
    groupName
) {

    const result =
        await client.pupPage.evaluate(
            async (
                targetGroupId,
                messageText
            ) => {

                const chats =
                    window
                        .require('WAWebCollections')
                        .Chat
                        .getModelsArray();

                const chat =
                    chats.find(
                        c =>
                            c.id?._serialized ===
                            targetGroupId
                    );

                if (!chat) {
                    throw new Error(
                        `Group model not found: ${targetGroupId}`
                    );
                }

                /*
                 * WWebJS.sendMessage() may successfully
                 * deliver the message while returning
                 * null/undefined for the message model.
                 *
                 * Therefore:
                 *
                 *   Promise resolves = send accepted/completed
                 *   Promise throws   = send failed
                 *
                 * Do NOT use !!msg as the success test.
                 */

                let msg = null;

                try {

                    msg =
                        await window.WWebJS.sendMessage(
                            chat,
                            messageText,
                            {
                                waitUntilMsgSent: true
                            }
                        );

                } catch (error) {

                    throw new Error(
                        `WWebJS.sendMessage failed: ${
                            error && error.stack
                                ? error.stack
                                : error
                        }`
                    );
                }

                return {
                    success: true,
                    messageId:
                        msg &&
                        msg.id &&
                        msg.id._serialized
                            ? msg.id._serialized
                            : null
                };
            },
            groupId,
            message
        );

    if (!result || result.success !== true) {

        throw new Error(
            `Announcement send failed: ${groupName}`
        );
    }

    log(
        `ANNOUNCEMENT SENT | ${groupName} | ${
            result.messageId || 'MESSAGE_ID_NOT_RETURNED'
        }`
    );

    return result;
}


// ============================================================
// PROCESS GROUPS
// ============================================================

async function processGroups(
    command
) {

    const groups =
        loadGroupNames();

    let success = 0;
    let failed = 0;

    log(
        `========== COMMAND ${command.toUpperCase()} ==========`
    );


    for (
        const groupName
        of groups
    ) {

        try {

            log(
                `PROCESSING | ${groupName}`
            );


            const group =
                await findGroupDirectly(
                    groupName
                );


            if (!group) {

                log(
                    `GROUP NOT FOUND | ${groupName}`
                );

                failed++;

                continue;
            }


            if (!group.isGroup) {

                log(
                    `NOT A GROUP | ${groupName}`
                );

                failed++;

                continue;
            }


            log(
                `GROUP FOUND | ${group.id} | ${group.name}`
            );


            switch (command) {

                case 'start':

                    /*
                     * 1. Open group for all members
                     * 2. Send start announcement
                     */

                    await setAdminOnly(
                        group.id,
                        false,
                        groupName
                    );

                    await sendAnnouncement(
                        group.id,
                        ANNOUNCEMENTS.start,
                        groupName
                    );

                    break;


                case 'warning1':



                    await setAdminOnly(


                        group.id,


                        false,


                        groupName


                    );



                    await sendAnnouncement(


                        group.id,


                        ANNOUNCEMENTS.warning1,


                        groupName


                    );



                    break;




                case 'warning2':



                    await setAdminOnly(


                        group.id,


                        false,


                        groupName


                    );



                    await sendAnnouncement(


                        group.id,


                        ANNOUNCEMENTS.warning2,


                        groupName


                    );



                    break;




                case 'close':

                    /*
                     * Closing order:
                     *
                     * 1. Send closing announcement
                     * 2. Wait for WhatsApp to process it
                     * 3. Turn admin-only ON
                     */

                    await sendAnnouncement(
                        group.id,
                        ANNOUNCEMENTS.close,
                        groupName
                    );

                    await new Promise(
                        resolve => setTimeout(resolve, 1500)
                    );

                    await setAdminOnly(
                        group.id,
                        true,
                        groupName
                    );

                    break;
            }


            success++;

        } catch (error) {

            failed++;

            log(
                `ERROR | ${groupName} | ${
                    error && error.stack
                        ? error.stack
                        : error
                }`
            );
        }
    }


    log(
        `COMMAND COMPLETE | ${command} | Success=${success} Failed=${failed}`
    );

    return {
        success,
        failed
    };
}


// ============================================================
// EXECUTE
// ============================================================

async function execute() {

    const command =
        process.argv[2];

    const validCommands = [
        'start',
        'warning1',
        'warning2',
        'close'
    ];

    if (
        !validCommands.includes(command)
    ) {

        throw new Error(
            'Usage: node group-message-control.js start|warning1|warning2|close'
        );
    }

    return await processGroups(
        command
    );
}


// ============================================================
// WHATSAPP STARTUP / RECOVERY
// ============================================================

function isRetryableStartupError(
    error
) {

    return Boolean(
        error &&
        (
            error.code ===
                'QR_TIMEOUT' ||

            error.code ===
                'READY_TIMEOUT' ||

            error.code ===
                'DISCONNECTED' ||

            error.code ===
                'INITIALIZE_FAILED' ||

            error.code ===
                'AUTH_SESSION_INVALID' ||

            error.code ===
                'AUTH_FAILURE'
        )
    );
}


async function connectAttempt(
    attemptNumber
) {

    const authExists =
        fs.existsSync(
            AUTH_SESSION_PATH
        );

    log(
        `WHATSAPP STARTUP ATTEMPT ${attemptNumber}/${MAX_STARTUP_ATTEMPTS}`
    );

    log(
        `AUTH SESSION: ${
            authExists
                ? 'EXISTS'
                : 'NOT FOUND'
        }`
    );

    return new Promise(
        (
            resolve,
            reject
        ) => {

            let settled =
                false;

            let authenticated =
                false;

            let ready =
                false;

            let qrTimer =
                null;

            let readyTimer =
                null;

            const finishResolve =
                value => {

                    if (settled) {
                        return;
                    }

                    settled = true;

                    if (qrTimer) {
                        clearTimeout(
                            qrTimer
                        );
                    }

                    if (readyTimer) {
                        clearTimeout(
                            readyTimer
                        );
                    }

                    resolve(
                        value
                    );
                };

            const finishReject =
                error => {

                    if (settled) {
                        return;
                    }

                    settled = true;

                    if (qrTimer) {
                        clearTimeout(
                            qrTimer
                        );
                    }

                    if (readyTimer) {
                        clearTimeout(
                            readyTimer
                        );
                    }

                    reject(
                        error
                    );
                };

            client =
                createClient();


            client.on(
                'qr',
                qr => {

                    if (settled) {
                        return;
                    }

                    log(
                        `WHATSAPP QR RECEIVED | Attempt=${attemptNumber}`
                    );

                    console.log(
                        '============================================================'
                    );

                    console.log(
                        'QR REQUIRED - SCAN WITH WHATSAPP'
                    );

                    console.log(
                        '============================================================'
                    );

                    qrcode.generate(
                        qr,
                        {
                            small: true
                        }
                    );

                    if (qrTimer) {
                        clearTimeout(
                            qrTimer
                        );
                    }

                    qrTimer =
                        setTimeout(
                            () => {

                                const error =
                                    new Error(
                                        'WhatsApp QR was not scanned before timeout.'
                                    );

                                error.code =
                                    'QR_TIMEOUT';

                                log(
                                    `WHATSAPP QR TIMEOUT | Attempt=${attemptNumber}`
                                );

                                finishReject(
                                    error
                                );

                            },
                            QR_TIMEOUT_MS
                        );
                }
            );


            client.once(
                'authenticated',
                () => {

                    if (settled) {
                        return;
                    }

                    authenticated =
                        true;

                    if (qrTimer) {
                        clearTimeout(
                            qrTimer
                        );

                        qrTimer =
                            null;
                    }

                    log(
                        'WHATSAPP AUTHENTICATED'
                    );

                    log(
                        'WAITING FOR WHATSAPP READY'
                    );
                }
            );


            client.on(
                'auth_failure',
                error => {

                    if (settled) {
                        return;
                    }

                    const message =
                        error &&
                        error.message
                            ? error.message
                            : String(
                                  error || ''
                              );

                    log(
                        `AUTH FAILURE | ${message}`
                    );

                    const failure =
                        new Error(
                            message ||
                            'WhatsApp authentication failure.'
                        );

                    failure.code =
                        authExists
                            ? 'AUTH_SESSION_INVALID'
                            : 'AUTH_FAILURE';

                    finishReject(
                        failure
                    );
                }
            );


            client.on(
                'disconnected',
                reason => {

                    if (settled) {
                        return;
                    }

                    log(
                        `WHATSAPP DISCONNECTED | ${reason || 'UNKNOWN'}`
                    );

                    const error =
                        new Error(
                            `WhatsApp disconnected: ${
                                reason || 'UNKNOWN'
                            }`
                        );

                    error.code =
                        'DISCONNECTED';

                    finishReject(
                        error
                    );
                }
            );


            client.on(
                'ready',
                async () => {

                    if (settled) {
                        return;
                    }

                    ready =
                        true;

                    if (qrTimer) {
                        clearTimeout(
                            qrTimer
                        );

                        qrTimer =
                            null;
                    }

                    if (readyTimer) {
                        clearTimeout(
                            readyTimer
                        );

                        readyTimer =
                            null;
                    }

                    log(
                        'WHATSAPP CLIENT READY'
                    );

                    log(
                        'WHATSAPP CONNECTION VERIFIED'
                    );

                    try {

                        const result =
                            await execute();

                        if (
                            result &&
                            result.failed >
                                0
                        ) {

                            const error =
                                new Error(
                                    `Group command completed with ${result.failed} failed group(s).`
                                );

                            error.code =
                                'GROUP_CONTROL_FAILED';

                            finishReject(
                                error
                            );

                            return;
                        }

                        log(
                            'GROUP CONTROL COMPLETED SUCCESSFULLY'
                        );

                        finishResolve(
                            0
                        );

                    } catch (error) {

                        log(
                            `FATAL ERROR | ${
                                error && error.stack
                                    ? error.stack
                                    : error
                            }`
                        );

                        const fatal =
                            error instanceof Error
                                ? error
                                : new Error(
                                      String(error)
                                  );

                        fatal.code =
                            fatal.code ||
                            'CONTROL_FAILED';

                        finishReject(
                            fatal
                        );
                    }
                }
            );


            /*
             * READY watchdog.
             *
             * This prevents the process from remaining alive forever
             * when the WhatsApp browser starts but READY never arrives.
             */
            readyTimer =
                setTimeout(
                    () => {

                        if (settled || ready) {
                            return;
                        }

                        const error =
                            new Error(
                                authenticated
                                    ? 'WhatsApp AUTHENTICATED but READY was not received before timeout.'
                                    : 'WhatsApp READY was not received before startup timeout.'
                            );

                        error.code =
                            'READY_TIMEOUT';

                        log(
                            `WHATSAPP READY TIMEOUT | Attempt=${attemptNumber}`
                        );

                        finishReject(
                            error
                        );

                    },
                    READY_TIMEOUT_MS
                );


            log(
                'INITIALIZING WHATSAPP CLIENT'
            );

            Promise.resolve(
                client.initialize()
            )
            .catch(
                error => {

                    if (settled) {
                        return;
                    }

                    log(
                        `WHATSAPP INITIALIZE FAILED | ${
                            error && error.stack
                                ? error.stack
                                : error
                        }`
                    );

                    const initError =
                        error instanceof Error
                            ? error
                            : new Error(
                                  String(error)
                              );

                    initError.code =
                        'INITIALIZE_FAILED';

                    finishReject(
                        initError
                    );
                }
            );
        }
    );
}


async function main() {

    const command =
        process.argv[2];

    const validCommands = [
        'start',
        'warning1',
        'warning2',
        'close'
    ];

    if (
        !validCommands.includes(
            command
        )
    ) {

        console.error(
            'Usage: node group-message-control.js start|warning1|warning2|close'
        );

        process.exitCode = 1;
        return;
    }

    for (
        let attempt = 1;
        attempt <=
            MAX_STARTUP_ATTEMPTS;
        attempt++
    ) {

        try {

            const exitCode =
                await connectAttempt(
                    attempt
                );

            await safeDestroyClient();

            log(
                `GROUP MESSAGE CONTROL EXIT | code=${exitCode}`
            );

            process.exit(
                exitCode
            );

        } catch (error) {

            await safeDestroyClient();

            const code =
                error &&
                error.code
                    ? error.code
                    : 'UNKNOWN';

            log(
                `STARTUP/CONTROL FAILURE | code=${code} | ${
                    error && error.stack
                        ? error.stack
                        : error
                }`
            );


            /*
             * Stored session exists but is no longer valid.
             *
             * IMPORTANT:
             * Do NOT delete the entire AUTH_PATH because other
             * WhatsApp clients can share the same LocalAuth dataPath.
             *
             * Only the group-message-control session is quarantined.
             */
            if (
                code ===
                    'AUTH_SESSION_INVALID'
            ) {

                try {

                    quarantineAuthSession();

                } catch (resetError) {

                    log(
                        `AUTH SESSION QUARANTINE FAILED | ${
                            resetError &&
                            resetError.stack
                                ? resetError.stack
                                : resetError
                        }`
                    );

                    process.exit(
                        1
                    );
                }

                if (
                    attempt <
                    MAX_STARTUP_ATTEMPTS
                ) {

                    log(
                        'STORED AUTH SESSION INVALID - STARTING FRESH QR LOGIN'
                    );

                    continue;
                }
            }


            if (
                isRetryableStartupError(
                    error
                ) &&
                attempt <
                    MAX_STARTUP_ATTEMPTS
            ) {

                log(
                    `RECOVERY RETRY | Next attempt ${
                        attempt + 1
                    }/${MAX_STARTUP_ATTEMPTS}`
                );

                continue;
            }


            /*
             * Never continue to group processing after startup failure.
             */
            log(
                '============================================================'
            );

            log(
                'WHATSAPP STARTUP FAILED'
            );

            log(
                `Reason: ${code}`
            );

            log(
                'Group operations were NOT started.'
            );

            log(
                'EXIT CODE: 1'
            );

            log(
                '============================================================'
            );

            process.exit(
                1
            );
        }
    }

    process.exit(
        1
    );
}


// ============================================================
// START
// ============================================================

log(
    '============================================================'
);

log(
    'Starting Group Message Control'
);

log(
    `Group file: ${GROUP_FILE}`
);

log(
    `Group control directory: ${BASE_DIR}`
);

log(
    `Timezone: ${TIMEZONE}`
);

log(
    `QR timeout: ${QR_TIMEOUT_MS / 1000}s`
);

log(
    `READY timeout: ${READY_TIMEOUT_MS / 1000}s`
);

log(
    `Maximum startup attempts: ${MAX_STARTUP_ATTEMPTS}`
);

log(
    `Auth session path: ${AUTH_SESSION_PATH}`
);

log(
    '============================================================'
);

main().catch(
    error => {

        log(
            `UNHANDLED STARTUP ERROR | ${
                error && error.stack
                    ? error.stack
                    : error
            }`
        );

        process.exit(
            1
        );
    }
);
