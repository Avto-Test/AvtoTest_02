import { Quote, Star } from "lucide-react";

const testimonials = [
  {
    name: "Sardor Karimov",
    role: "Yangi haydovchi",
    content:
      "AUTOTEST yordamida birinchi urinishda testdan o'tdim. AI tushuntirishlari juda foydali bo'ldi va xatolarimni tez tushunib oldim.",
    rating: 5,
    avatar: "SK",
  },
  {
    name: "Nilufar Rahimova",
    role: "Talaba",
    content:
      "Gamifikatsiya tizimi o'rganishni qiziqarli qildi. Har kuni XP to'plash va daraja oshirish motivatsiya beradi.",
    rating: 5,
    avatar: "NR",
  },
  {
    name: "Jasur Toshmatov",
    role: "Professional haydovchi",
    content:
      "Real vaziyatlar asosidagi savollar juda foydali. Nazariyani emas, haqiqiy yo'l qoidalarini amaliy tarzda o'rganasiz.",
    rating: 5,
    avatar: "JT",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="landing-section landing-section-muted landing-glow-blue scroll-mt-24">
      <div className="landing-container px-4 sm:px-6 lg:px-8">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Foydalanuvchilar fikri</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Minglab haydovchilar AUTOTEST yordamida testlardan muvaffaqiyatli o&apos;tishdi.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="landing-panel landing-card-hover group relative rounded-2xl border border-border/50 bg-card p-6"
            >
              <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Quote className="h-4 w-4 text-primary" />
              </div>

              <div className="mb-4 flex gap-1">
                {Array.from({ length: testimonial.rating }).map((_, index) => (
                  <Star key={`${testimonial.name}-${index}`} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>

              <p className="mb-6 leading-relaxed text-muted-foreground">&ldquo;{testimonial.content}&rdquo;</p>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-medium text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
