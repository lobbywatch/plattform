# Postfinance Import

The Postfinance import goes through the follwoing steps:

1. If no `PF_SFTP_CONNECTIONS` are configured, `GOTO 4`.
2. Download all `camt053.xml` and `camt053.tar.gz` files from all configured Sftp servers.
3. Write these files to the following db table: `postfinanceImports`.
4. Read all files where `isImported === false` from the db.
5. Unpack all `tar` files. These contain one `camt053.xml` file and `.tiff` files. The images are scans of over the counter cash payments (Einzahlungsschein).
6. Convert images to `.jpeg`.
7. Parse XML files (c.f. [parseCamt053.u.jest.ts](parseCamt053.u.jest.ts)).
8. Filter out the following payment entries:

- All `DEBIT` entries.
- All `CREDIT` entries from `STRIPE`.
- All `CREDIT` entries from `PAYPAL`.
- All `CREDIT` entries starting with `SAMMELGUTSCHRIFT`.
- All debit card `CREDIT` entries (Online Postfinance Zahlung).

9. Write payment entries to the follwing db table: `postfinancePayments`.
10. Run the payment matcher.
11. Send notifications to accountant.
12. If all payments could be matched, send payment reminders.

## Config

As you can see in the `.env.example` file, the Sftp servers are configured as follows:

```
PF_SFTP_CONNECTIONS=[{ host: 'one.com', port: 2222, username: 'accountant', privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n\n-----END OPENSSH PRIVATE KEY-----\n'},{ host: 'two.com', port: 2222, username: 'accountant', privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n\n-----END OPENSSH PRIVATE KEY-----\n'}]
```

Dry run sending payment reminders by setting the following `.env`:

```
DRY_RUN_SEND_PAYMENT_REMINDERS=true
```

## Development

On development, you can run the postfinance import task as follows:

```
cd packages/republik-crowdfundings && yarn dev:postfinance:import
```

If you prefere to work without a local Sftp server, you can get
the entries from the following db table from production: `postfinanceImports`.

If contains the files from the Sftp server. All files that `isImported === FALSE`
will be imported.

## Documentation

### camt.053

camt.053 (account statement) is part of ISO 20022 XML format and files Postfinance provides.

- [Postfinance «Technical Specifications Manual»](https://www.postfinance.ch/content/dam/pfch/doc/cust/download/tech_spez_biz_man_en_new.pdf)
