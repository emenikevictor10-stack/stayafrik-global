# Update bank transfer account details

Replace the account guests pay into by bank transfer:

- Bank: Wema Bank
- Account number: 0127896762
- Account name: REXOHUB CONSULT AND TECHNOLOGIES LIMITED

## Technical details
- Update `app_settings` rows `bank_transfer_bank`, `bank_transfer_number`, `bank_transfer_name` (data change only, no code change).
- Verify by reading the rows back and opening `/pay/transfer` page on a test hold to confirm the new details show.
- Existing waiting transfers will also show the new details when reopened.
