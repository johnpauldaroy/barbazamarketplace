import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  CircleDot,
  Eye,
  HeartHandshake,
  ShieldCheck,
  Sprout,
  Users,
  Award,
  BriefcaseBusiness,
  HandHelping,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const VALUES = [
  {
    icon: BriefcaseBusiness,
    title: 'Competence',
  },
  {
    icon: ShieldCheck,
    title: 'Accountability',
  },
  {
    icon: HandHelping,
    title: 'Responsibility',
  },
  {
    icon: Award,
    title: 'Excellence',
  },
  {
    icon: Users,
    title: 'Service',
  },
];

const FOUNDING_YEAR = 1964;

const STATS = [
  { value: new Date().getFullYear() - FOUNDING_YEAR, suffix: '', label: 'Years of service' },
  { value: 148000, suffix: '+', label: 'Active members' },
  { value: 500, suffix: '+', label: 'Products available' },
  { value: 20, suffix: '', label: 'Partner members' },
];

const CountUpStat = ({ value, suffix, label, delay = 0 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let frameId;
    const duration = 1200;
    const startTime = performance.now() + delay;

    const update = (currentTime) => {
      if (currentTime < startTime) {
        frameId = requestAnimationFrame(update);
        return;
      }

      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [delay, isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: delay / 1000 }}
    >
      <p className="text-3xl font-bold sm:text-4xl">
        {displayValue.toLocaleString('en-US')}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-white/75">{label}</p>
    </motion.div>
  );
};

const AboutPage = () => {
  return (
    <div className="pb-16">
      <Helmet>
        <title>About Us — Barbaza MPC & e-KoopMart</title>
        <meta name="description" content="Learn about Barbaza Multi-Purpose Cooperative — our history, mission, and how e-KoopMart connects members, families, and local producers in Barbaza, Antique." />
        <link rel="canonical" href="https://ekoopmart.barbazampc.coop/about" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="About Barbaza MPC — e-KoopMart" />
        <meta property="og:description" content="Learn about Barbaza Multi-Purpose Cooperative and how e-KoopMart connects members, families, and local producers." />
        <meta property="og:url" content="https://ekoopmart.barbazampc.coop/about" />
        <meta property="og:image" content="https://ekoopmart.barbazampc.coop/logo512.png" />
        <meta property="og:site_name" content="e-KoopMart" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="About Barbaza MPC — e-KoopMart" />
      </Helmet>

      <section className="relative overflow-hidden border-b border-white/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(46,167,255,0.18),_transparent_28%),linear-gradient(135deg,#0b1739_0%,#15337f_55%,#2ea7ff_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl text-white">
            <Badge className="border border-white/15 bg-white/10 text-white">
              About Barbaza MPC
            </Badge>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Building a stronger community through cooperation, service, and shared growth.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/78 sm:text-lg">
              Barbaza Multi-Purpose Cooperative continues to connect members,
              local producers, and families through trusted services, fair
              opportunities, and a marketplace rooted in community values.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products">
                <Button size="lg" className="gap-2 bg-white text-[#0b1739] shadow-none hover:bg-[#eef5ff]">
                  Browse marketplace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/25 bg-white/5 text-white hover:border-white hover:bg-white/10 hover:text-white"
                >
                  Contact us
                </Button>
              </Link>
            </div>
          </div>

          <div className="surface-card relative overflow-hidden border-white/10 bg-white/12 p-4 backdrop-blur-md">
            <div className="relative overflow-hidden rounded-[26px]">
              <img
                src="/assets/images/local_farmer_antique.png"
                alt="Local farmer in Antique province"
                className="h-[420px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1739]/55 via-transparent to-[#0b1739]/15" />
            </div>

            <Card className="absolute bottom-6 left-6 z-10 max-w-[300px] border-white/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2954C8]">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0b1739]">Community-rooted mission</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Supporting livelihoods, shared progress, and trusted cooperative service.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-white/95">
            <CardContent className="p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2954C8]">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-[#0b1739]">Our Mission</h2>
              <p className="mt-4 text-sm leading-8 text-slate-500 sm:text-base">
                We deliver responsive products and excellent services to uplift the quality of life of the members and the community.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#eef5ff] via-white to-[#dfeeff]">
            <CardContent className="p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#2954C8] shadow-sm">
                <Eye className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-[#0b1739]">Our Vision</h2>
              <p className="mt-4 text-sm leading-8 text-slate-500 sm:text-base">
                The most trusted and internationally-recognized cooperative of empowered members.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="secondary">Our Core Values</Badge>
            <h2 className="mt-3 text-3xl font-bold text-[#0b1739]">
              Competence with Accountability and Responsibility towards Excellent Service.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            CARES is the value foundation of Barbaza MPC, shaping how we serve
            members, build trust, and deliver meaningful support to the community.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {VALUES.map((item) => {
            const Icon = item.icon;
            const firstLetter = item.title.charAt(0);
            const restOfTitle = item.title.slice(1);
            return (
              <Card key={item.title} className="bg-white/95">
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2954C8]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[#0b1739]">
                    <span className="text-[#2954C8]">{firstLetter}</span>
                    {restOfTitle}
                  </h3>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-8 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
            <div>
              <Badge variant="secondary">Our Story</Badge>
              <h2 className="mt-4 text-3xl font-bold text-[#0b1739]">From a small shared vision to a growing community institution.</h2>
              <p className="mt-4 text-sm leading-8 text-slate-500 sm:text-base">
                Founded in {FOUNDING_YEAR}, Barbaza Multi-Purpose Cooperative began with a
                group of committed farmers and community members who believed in
                collective progress. What started as a simple savings effort has
                grown into a trusted cooperative serving members across Antique.
              </p>
              <p className="mt-4 text-sm leading-8 text-slate-500 sm:text-base">
                Today, Barbaza MPC continues to expand its impact through
                agricultural support, consumer goods, financial services, and an
                online marketplace that brings member products closer to the
                community.
              </p>
            </div>

            <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#eef5ff] via-white to-[#dfeeff] p-3">
              <img
                src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80"
                alt="Local produce and community market"
                className="h-full w-full rounded-[22px] object-cover"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
        >
        <Card className="overflow-hidden bg-gradient-to-r from-[#0b1739] via-[#1b44b7] to-[#2ea7ff] text-white">
          <CardContent className="grid gap-6 p-8 sm:grid-cols-2 xl:grid-cols-4">
            {STATS.map((item, index) => (
              <CountUpStat
                key={item.label}
                value={item.value}
                suffix={item.suffix}
                label={item.label}
                delay={index * 120}
              />
            ))}
          </CardContent>
        </Card>
        </motion.div>
      </section>
    </div>
  );
};

export default AboutPage;
