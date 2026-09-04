import { redirect } from 'next/navigation';

export default function AdminInterviewsRedirect() {
  redirect('/admin/schedule');
}
