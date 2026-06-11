'use client'

import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

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
import { doctors } from '@/lib/data/doctors'

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
  reason: z.string().min(10, 'This field is required.'),
})

type AppointmentFormValues = z.infer<typeof appointmentSchema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AppointmentForm() {
  const t = useTranslations('appointment')
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientName: '',
      phone: '',
      preferredDoctor: '',
      preferredDate: '',
      reason: '',
    },
  })

  const onSubmit = (data: AppointmentFormValues) => {
    // TODO Phase 7: Add POST /api/appointments call here
    void data
    toast.success(t('success.title'), {
      description: t('success.description'),
      duration: 6000,
    })
    form.reset()
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
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.name}
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

            {/* Field 5 — Reason / Chief Complaint */}
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

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
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
