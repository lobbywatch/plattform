const moment = require('moment')

module.exports = {
  template: record => record.info && record.info.template,
  subject: record => record.info && record.info.message && record.info.message.subject,
  status: record =>
    (record.mandrillLastEvent && record.mandrillLastEvent.msg.state) ||
    (record.result && record.result.status) ||
    record.status.toLowerCase(),
  error: record =>
    (record.mandrillLastEvent && record.mandrillLastEvent.msg && record.mandrillLastEvent.msg.diag) ||
    (record.result && record.result.reject_reason) ||
    (record.error && record.error.message) ||
    (record.error && record.error.meta && record.error.meta.error && record.error.meta.error.type),
  user: async (record, args, { loaders }) => loaders.User.byIdOrEmail.load([record.userId, record.email]),
  mandrill: (record, args, { auth, user: me }) => {
    if (!auth.Roles.userIsInRoles(me, ['admin', 'supporter'])) {
      return null
    }

    return [
      record.createdAt > moment().subtract(30, 'days') && record.result && record.result._id && {
        label: 'View Content',
        url: [
          'https://mandrillapp.com/activity/content?id=',
          moment(record.createdAt).format('YYYYMMDD'),
          '_',
          record.result._id
        ].join('')
      },
      {
        label: 'Check Backlist',
        url: `https://mandrillapp.com/settings/rejections?q=${record.email}`
      }
    ].filter(Boolean)
  }
}
