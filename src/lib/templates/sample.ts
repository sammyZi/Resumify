/**
 * sample.ts — realistic placeholder resume data for template previews.
 *
 * Used by the template galleries so every preview looks like a complete resume
 * regardless of whether the user has entered their own data yet.
 */

import type { ResumeData } from '@/lib/types'

export const SAMPLE_RESUME: ResumeData = {
  fullName: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  phone: '+1 (555) 123-4567',
  location: 'San Francisco, CA',
  summary:
    'Product-minded software engineer with 6+ years building reliable web platforms. I enjoy turning ambiguous problems into simple, well-tested systems and mentoring the team along the way.',
  links: [
    { type: 'linkedin', url: 'https://linkedin.com/in/alexmorgan' },
    { type: 'github', url: 'https://github.com/alexmorgan' },
    { type: 'leetcode', url: 'https://leetcode.com/alexmorgan' },
    { type: 'website', url: 'https://alexmorgan.dev' },
  ],
  experience: [
    {
      title: 'Senior Product Engineer',
      organization: 'Northwind Labs',
      startDate: '2021-03',
      endDate: null,
      description:
        'Led a team of five building the analytics platform. Cut p95 latency by 40% and shipped the self-serve dashboard used by 12k customers.',
    },
    {
      title: 'Software Engineer',
      organization: 'Brightwave',
      startDate: '2018-06',
      endDate: '2021-02',
      description:
        'Built core billing services and the public API used by 200+ partners. Mentored two junior engineers.',
    },
  ],
  projects: [
    {
      name: 'DevPulse',
      description:
        'Open-source dashboard that aggregates CI/CD metrics across repositories with real-time alerts.',
      techStack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Redis'],
      liveUrl: 'https://devpulse.app',
      repoUrl: 'https://github.com/alexmorgan/devpulse',
    },
    {
      name: 'Snippet Vault',
      description: 'A keyboard-first code snippet manager with full-text search and sync.',
      techStack: ['React', 'Tauri', 'Rust', 'SQLite'],
      liveUrl: 'https://snippetvault.dev',
      repoUrl: 'https://github.com/alexmorgan/snippet-vault',
    },
  ],
  education: [
    {
      institution: 'State University',
      credential: 'B.S. Computer Science',
      startDate: '2014-09',
      endDate: '2018-05',
      description: 'Graduated with honors. Focus on distributed systems.',
    },
  ],
  certifications: [
    { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', year: '2023' },
    { name: 'Professional Scrum Master I', issuer: 'Scrum.org', year: '2021' },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'System Design', 'GraphQL'],
  achievements: [
    'Speaker at NodeConf 2023 on scaling event-driven systems.',
    'Reduced cloud spend by 28% through autoscaling and caching improvements.',
    'Top 3% on LeetCode (1900+ contest rating).',
  ],
}
