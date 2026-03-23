import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const CONTACT_ITEMS = [
  {
    icon: MapPin,
    title: 'Visit us',
    content: (
      <>
        Main Street, Poblacion
        <br />
        Barbaza, Antique 5706
        <br />
        Philippines
      </>
    ),
  },
  {
    icon: Phone,
    title: 'Call us',
    content: (
      <>
        (036) 123-4567
        <br />
        0917-123-4567
      </>
    ),
  },
  {
    icon: Mail,
    title: 'Email us',
    content: (
      <>
        info@barbazampc.coop
        <br />
        support@barbazampc.coop
      </>
    ),
  },
  {
    icon: Clock3,
    title: 'Office hours',
    content: (
      <>
        Monday to Friday, 8:00 AM to 5:00 PM
        <br />
        Saturday, 8:00 AM to 12:00 PM
      </>
    ),
  },
];

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="pb-16">
      <Helmet>
        <title>Contact Us - Barbaza MPC Marketplace</title>
        <meta
          name="description"
          content="Get in touch with Barbaza Multi-Purpose Cooperative. We're here to help."
        />
      </Helmet>

      <section className="relative overflow-hidden border-b border-white/60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(46,167,255,0.18),_transparent_28%),linear-gradient(135deg,#0b1739_0%,#15337f_55%,#2ea7ff_100%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl text-white">
            <Badge className="border border-white/15 bg-white/10 text-white">
              Contact Barbaza MPC
            </Badge>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              We are here to serve members, families, and the wider community.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/78 sm:text-lg">
              Reach out for product inquiries, membership concerns, cooperative
              services, or support from the Barbaza MPC team.
            </p>
          </div>

          <div className="surface-card relative overflow-hidden border-white/10 bg-white/12 p-4 backdrop-blur-md">
            <div className="relative overflow-hidden rounded-[26px]">
              <img
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80"
                alt="Community support and customer assistance"
                className="h-[420px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1739]/55 via-transparent to-[#0b1739]/15" />
            </div>

            <Card className="absolute bottom-6 left-6 z-10 max-w-[300px] border-white/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2954C8]">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0b1739]">Community support</p>
                    <p className="text-sm leading-6 text-slate-600">
                      Send us your questions and our team will be glad to assist you.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div>
              <Badge variant="secondary">Get in touch</Badge>
              <h2 className="mt-4 text-3xl font-bold text-[#0b1739]">Let us know how Barbaza MPC can help.</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Whether you have questions about products, membership, or cooperative services, we are ready to respond.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {CONTACT_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="bg-white/95">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2954C8]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-lg font-semibold text-[#0b1739]">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-500">{item.content}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="bg-white/95">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6">
                <Badge variant="secondary">Send a message</Badge>
                <h2 className="mt-4 text-3xl font-bold text-[#0b1739]">Contact our team</h2>
              </div>

              {submitted ? (
                <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Send className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-[#0b1739]">Thank you</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    Your message has been sent successfully. We will get back to you as soon as possible.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setSubmitted(false)}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we help?"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us more..."
                      rows="6"
                      required
                      className="flex w-full rounded-xl border border-[#d7e2f1] bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-[#2954C8] focus:outline-none focus:ring-2 focus:ring-[#2954C8]/25"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2 sm:w-auto">
                    <Send className="h-4 w-4" />
                    Send message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card className="overflow-hidden bg-gradient-to-r from-[#0b1739] via-[#1b44b7] to-[#2ea7ff] text-white">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white">
              <MapPin className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-3xl font-bold">Find us in Barbaza, Antique</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/75">
              Located in the heart of Poblacion and accessible from the main road, Barbaza MPC continues to serve members and the community with trusted cooperative support.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ContactPage;
