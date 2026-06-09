import { useEffect, useState, type FormEvent } from 'react'
import { Dialog } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select } from '../ui/select'
import { Alert } from '../ui/alert'
import type { Contact } from '../../../../shared/types'
import { useContactsStore } from '../../store/contacts'
import { useT } from '../../i18n'

interface ContactDialogProps {
  open: boolean
  contact: Contact | null
  onClose: () => void
}

export function ContactDialog({ open, contact, onClose }: ContactDialogProps): JSX.Element {
  const { t } = useT()
  const { groups, create, update } = useContactsStore()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [groupId, setGroupId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setFirstName(contact?.firstName ?? '')
      setLastName(contact?.lastName ?? '')
      setEmail(contact?.email ?? '')
      setCompany(contact?.company ?? '')
      setGroupId(contact?.groupId ?? '')
      setError(null)
    }
  }, [open, contact])

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!email.includes('@')) {
      setError(t('contacts.form.invalidEmail'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        company: company.trim() || null,
        customFields: contact?.customFields ?? {},
        groupId: groupId === '' ? null : Number(groupId)
      }
      if (contact) {
        await update(contact.id, payload)
      } else {
        await create(payload)
      }
      onClose()
    } catch (e) {
      const msg = (e as Error).message
      if (msg.includes('UNIQUE')) {
        setError(t('contacts.form.duplicateEmail'))
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={contact ? t('contacts.form.titleEdit') : t('contacts.form.titleNew')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">{t('contacts.form.firstName')}</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">{t('contacts.form.lastName')}</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">{t('contacts.form.email')}</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="company">{t('contacts.form.company')}</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group">{t('contacts.form.group')}</Label>
          <Select
            id="group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">{t('contacts.form.noGroup')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={busy}>
            {contact ? t('contacts.form.submitEdit') : t('contacts.form.submitNew')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
