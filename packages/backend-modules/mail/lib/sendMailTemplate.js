const checkEnv = require('check-env')
const debug = require('debug')('mail:lib:sendMailTemplate')
const fs = require('fs').promises
const path = require('path')
const Promise = require('bluebird')

const shouldScheduleMessage = require('../utils/shouldScheduleMessage')
const shouldSendMessage = require('../utils/shouldSendMessage')
const sendResultNormalizer = require('../utils/sendResultNormalizer')
const NodemailerInterface = require('../NodemailerInterface')
const MandrillInterface = require('../MandrillInterface')
const { send } = require('./mailLog')

checkEnv([
  'DEFAULT_MAIL_FROM_ADDRESS',
  'DEFAULT_MAIL_FROM_NAME',
  'ASSETS_SERVER_BASE_URL',
  'FRONTEND_BASE_URL',
])

const {
  DEFAULT_MAIL_FROM_ADDRESS,
  DEFAULT_MAIL_FROM_NAME,
  SEND_MAILS_TAGS,
  SEND_MAILS_SUBJECT_PREFIX,
  FRONTEND_BASE_URL,
  SG_FONT_STYLES,
  SG_FONT_FACES,
  ASSETS_SERVER_BASE_URL,
} = process.env

const getTemplate = async (filehandler) => {
  const template = await filehandler
    .readFile({ encoding: 'utf8' })
    .catch(() => null)
  await filehandler.close()
  return template
}

const getTemplates = async (name) =>
  Promise.props({
    html: fs
      .open(path.resolve(`${__dirname}/../templates/${name}.html`))
      .then(getTemplate)
      .catch(() => null),
    text: fs
      .open(path.resolve(`${__dirname}/../templates/${name}.txt`))
      .then(getTemplate)
      .catch(() => null),
  })

const envMergeVars = [
  {
    name: 'frontend_base_url',
    content: FRONTEND_BASE_URL,
  },
  {
    name: 'link_faq',
    content: `${FRONTEND_BASE_URL}/faq`,
  },
  {
    name: 'link_manifest',
    content: `${FRONTEND_BASE_URL}/manifest`,
  },
  {
    name: 'link_imprint',
    content: `${FRONTEND_BASE_URL}/impressum`,
  },
  {
    name: 'assets_server_base_url',
    content: ASSETS_SERVER_BASE_URL,
  },
  {
    name: 'link_signin',
    content: `${FRONTEND_BASE_URL}/de/merci`,
  },
  {
    name: 'link_account',
    content: `${FRONTEND_BASE_URL}/de/merci`,
  },
  {
    name: 'link_account_share',
    content: `${FRONTEND_BASE_URL}/teilen`,
  },
]

if (SG_FONT_FACES) {
  envMergeVars.push({
    name: 'sg_font_faces',
    content: SG_FONT_FACES,
  })
}

if (SG_FONT_STYLES) {
  try {
    const styles = JSON.parse(SG_FONT_STYLES)
    Object.keys(styles).forEach((styleKey) => {
      const style = styles[styleKey]
      envMergeVars.push({
        // sansSerifRegular -> SANS_SERIF_REGULAR
        name: `sg_font_style_${styleKey
          .replace(/[A-Z]/g, (char) => `_${char}`)
          .toLowerCase()}`,
        content: Object.keys(style)
          .map((key) => {
            // fontWeight -> font-weight
            return `${key.replace(
              /[A-Z]/g,
              (char) => `-${char.toLowerCase()}`,
            )}:${style[key]};`
          })
          .join(''),
      })
    })
  } catch (e) {
    console.warn('invalid SG_FONT_STYLES env')
  }
}

// usage
// sendMailTemplate({
//  to: 'p@tte.io',
//  fromEmail: 'jefferson@project-r.construction',
//  fromName: 'Jefferson',
//  subject: 'dear friend',
//  templateName: 'MANDRIL TEMPLATE',
//  globalMergeVars: [{
//    name: 'VARNAME',
//    content: 'replaced with this'
//  }],
//  attachments: [{
//    type: 'application/pdf',
//    name: 'SOMETHING.pdf',
//    content: '<base64 encoded content>'
//  }]
// })
module.exports = async (mail, context, log) => {
  // sanitize
  const tags = []
    .concat(SEND_MAILS_TAGS && SEND_MAILS_TAGS.split(','))
    .concat(mail.templateName && mail.templateName)
    .filter(Boolean)

  const mergeVars = [...(mail.globalMergeVars || []), ...envMergeVars].filter(
    Boolean,
  )

  const { html, text } = await getTemplates(mail.templateName)

  const message = {
    to: [{ email: mail.to }],
    subject:
      (SEND_MAILS_SUBJECT_PREFIX &&
        `[${SEND_MAILS_SUBJECT_PREFIX}] ${mail.subject}`) ||
      mail.subject,
    from_email: mail.fromEmail || DEFAULT_MAIL_FROM_ADDRESS,
    from_name: mail.fromName || DEFAULT_MAIL_FROM_NAME,
    html,
    text: text || mail.text,
    merge_language: mail.mergeLanguage || 'handlebars',
    global_merge_vars: mergeVars,
    auto_text: !text,
    tags,
    attachments: mail.attachments,
  }

  debug({
    ...message,
    html: !!message.html,
    text: !!message.text,
    attachments: message.attachments?.map(({ name, type }) => ({ name, type })),
  })

  const sendFunc = sendResultNormalizer(
    shouldScheduleMessage(mail, message),
    shouldSendMessage(message),
    () => {
      // Backup method to send emails
      const nodemailer = NodemailerInterface({ logger: console })
      if (nodemailer.isUsable(mail, message)) {
        return nodemailer.send(message)
      }

      // Default method to send emails
      const mandrill = MandrillInterface({ logger: console })
      if (mandrill.isUsable(mail, message)) {
        return mandrill.send(
          message,
          !message.html ? mail.templateName : false,
          [],
        )
      }

      return [{ error: 'No mailing interface usable', status: 'error' }]
    },
  )

  return send({
    log,
    sendFunc,
    message: {
      ...message,
      html: !!message.html,
      text: !!message.text,
      attachments: message.attachments?.map(({ name, type }) => ({
        name,
        type,
      })),
    },
    email: message.to[0].email,
    template: mail.templateName,
    context,
  })
}

module.exports.getTemplates = getTemplates
module.exports.envMergeVars = envMergeVars
