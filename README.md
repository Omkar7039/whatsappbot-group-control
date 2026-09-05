# WhatsApp Group Message Control

Simple command-line controller for changing WhatsApp group message permissions and sending scheduled announcements.

## Project

**Project name:** WhatsApp Group Message Control

**Main file:**

```text
group-message-control/group-message-control.js

Group list:

group-message-control/groups/group_name.txt
Requirements

Tested environment:

OS              : RHEL 9.x
Node.js         : 20.x
npm             : 10.x
whatsapp-web.js : 1.34.7

Node.js 20 or newer is required.

Installation

Clone the repository:

git clone https://github.com/Omkar7039/whatsappbot-group-control.git
cd whatsappbot-group-control

Install everything with one command:

./install.sh

The installer:

checks Node.js and npm
checks required project files
installs the exact locked dependencies with npm ci
verifies whatsapp-web.js version
checks JavaScript syntax
First Run

Start the controller:

node group-message-control/group-message-control.js start

On the first run, WhatsApp may display a QR code.

Scan the QR code using the WhatsApp account that is an administrator of the required group.

The authenticated session is stored locally by LocalAuth.

Commands
Start
node group-message-control/group-message-control.js start

Actions:

Opens the group for all members.
Sends the start announcement.
Warning 1
node group-message-control/group-message-control.js warning1

Actions:

Opens the group for all members.
Sends the warning 1 announcement.
Warning 2
node group-message-control/group-message-control.js warning2

Actions:

Opens the group for all members.
Sends the warning 2 announcement.
Close
node group-message-control/group-message-control.js close

Actions:

Sends the closing announcement.
Waits briefly for WhatsApp to process the message.
Changes the group to admin-only messaging.
Command Usage

Without a valid command:

node group-message-control/group-message-control.js

Output:

Usage: node group-message-control.js start|warning1|warning2|close

Valid commands:

start
warning1
warning2
close
Group Configuration

Edit:

group-message-control/groups/group_name.txt

Put one WhatsApp group name on each line.

Example:

योगी हरीबाबा वधूवर सुचक 1995
योगी हरीबाबा वधूवर सुचक 1996
योगी हरीबाबा वधूवर सुचक 1997

The controller searches WhatsApp for matching group names.

Announcements

Announcement text is defined inside:

group-message-control/group-message-control.js

The controller supports:

start
warning1
warning2
close

Warning messages can use the same text when required.

Important Runtime Paths

Main application:

group-message-control/group-message-control.js

Group list:

group-message-control/groups/group_name.txt

Node dependencies:

node_modules/

WhatsApp authentication is stored outside the Git repository through the configured LocalAuth data path.

Do not commit WhatsApp authentication/session files.

Verification

Check installed version:

node -p "require('whatsapp-web.js/package.json').version"

Expected:

1.34.7

Check JavaScript syntax:

node --check group-message-control/group-message-control.js

Check installation:

./install.sh
Successful Output

A successful command ends with:

COMMAND COMPLETE | <command> | Success=1 Failed=0
GROUP CONTROL COMPLETED SUCCESSFULLY
GROUP MESSAGE CONTROL EXIT | code=0

Example:

COMMAND COMPLETE | start | Success=1 Failed=0
GROUP CONTROL COMPLETED SUCCESSFULLY
GROUP MESSAGE CONTROL EXIT | code=0
Troubleshooting
QR code appears

Scan the displayed QR code with the administrator WhatsApp account.

Session already exists

The existing LocalAuth session is reused automatically.

Group not found

Check:

cat group-message-control/groups/group_name.txt

The group name must match the WhatsApp group name.

Group admin permission failure

The WhatsApp account used by the controller must be an administrator of the target group.

Dependency problem

Run:

rm -rf node_modules
npm ci

Then verify:

node -p "require('whatsapp-web.js/package.json').version"
Syntax problem

Run:

node --check group-message-control/group-message-control.js
Deployment on a New Server

Complete deployment:

git clone https://github.com/Omkar7039/whatsappbot-group-control.git
cd whatsappbot-group-control
./install.sh

Then:

node group-message-control/group-message-control.js start

Use the required command:

start
warning1
warning2
close
GitHub Repository

Repository:

https://github.com/Omkar7039/whatsappbot-group-message-control
Security

Never commit:

.env
WhatsApp authentication sessions
session data
node_modules
runtime logs
private credentials
tokens

Authentication/session data must remain on the server and outside Git.

Tested

The controller has been tested with:

WhatsApp Web : 2.3000.1046894600
Node.js      : v20.20.2
npm          : 10.8.2
whatsapp-web.js : 1.34.7

Validated workflows:

start     PASS
warning1  PASS
warning2  PASS
close     PASS

The close workflow sends the closing announcement and then enables admin-only messaging.
