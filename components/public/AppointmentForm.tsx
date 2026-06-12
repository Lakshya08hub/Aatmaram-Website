'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import HCaptcha from '@hcaptcha/react-hcaptcha'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent } from '@/components/ui/card'
import { submitAppointmentAction } from '@/lib/actions/submitAppointmentAction'

// ---------------------------------------------------------------------------
// Zod schema — defined outside component to avoid re-creation on each render
// ---------------------------------------------------------------------------
const appointmentSchema = z.object({
  patientName: z.string().min(2, 'This field is required.'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
  preferredDoctor: z.string().min(1, 'This field is required.'),
  preferredDate: z.string().refine(
    (val) =>
      !val ||
      new Date(val) >= new Date(new Date().toISOString().split('T')[0]),
    'Please select a date from today onwards.'
  ),
  preferredTime: z.enum(['morning', 'afternoon', 'evening']),
  reason: z.string().min(10, 'This field is required.'),
})

type AppointmentFormValues = z.infer<typeof appointmentSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface DoctorOption {
  id: string
  full_name: string
}

interface AppointmentFormProps {
  doctors: DoctorOption[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AppointmentForm({ doctors }: AppointmentFormProps) {
  const t = useTranslations('appointment')
  const captchaRef = useRef<HCaptcha>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientName: '',
      phone: '',
      preferredDoctor: '',
      preferredDate: '',
      // Empty string keeps Select controlled from mount (avoids uncontrolled→controlled warning).
      // Zod enum rejects '' on submit, showing the required error.
      preferredTime: '' as unknown as 'morning',
      reason: '',
    },
  })

  const onSubmit = async (data: AppointmentFormValues) => {
    if (!captchaToken) {
      toast.error('Please complete the captcha before submitting.')
      return
    }

    const result = await submitAppointmentAction({
      patientName: data.patientName,
      phone: data.phone,
      preferredDoctor: data.preferredDoctor,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      reason: data.reason,
      captchaToken,
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success(t('success.title'), {
      description: t('success.description'),
      duration: 6000,
    })
    form.reset()
    captchaRef.current?.resetCaptcha()
    setCaptchaToken(null)
  }

  return (
    <Card className="shadow-sm border border-slate-200 rounded-xl">
      <CardContent className="p-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            {/* Field 1 — Patient Name */}
            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('fields.patientName')}
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Your full name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field 2 — Phone Number */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('fields.phone')}
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="10-digit mobile number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field 3 — Preferred Doctor */}
            <FormField
              control={form.control}
              name="preferredDoctor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('fields.preferredDoctor')}
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl asWrapper>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('fields.preferredDoctorPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-preference">
                          {t('fields.noPreference')}
                        </SelectItem>
                        {doctors.map((doc) => (
                          <SelectItem key={doc.id} value={doc.full_name}>
                            {doc.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field 4 — Preferred Date */}
            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('fields.preferredDate')}
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field 5 — Preferred Time */}
            <FormField
              control={form.control}
              name="preferredTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('fields.preferredTime')}
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl asWrapper>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('fields.preferredTimePlaceholder') || 'Select a time slot'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning OPD (9am–12pm)</SelectItem>
                        <SelectItem value="afternoon">Afternoon OPD (12–3pm)</SelectItem>
                        <SelectItem value="evening">Evening OPD (3–6pm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Field 6 — Reason / Chief Complaint */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('fields.reason')}
                    <span className="text-red-500 ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('fields.reasonPlaceholder')}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* hCaptcha */}
            <HCaptcha
              ref={captchaRef}
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              disabled={!captchaToken || form.formState.isSubmitting}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold min-h-[44px]"
            >
              {t('submit')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
