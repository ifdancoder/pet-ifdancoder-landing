import { Head } from '@inertiajs/react';
import fallbackProfilePhoto from '../../images/profile.jpg';

type Project = {
    title: string;
    slug: string;
    description: string;
    stack: string;
    status: string;
    url: string | null;
    image: string | null;
};

type WelcomeProps = {
    projects: Project[];
    profilePhoto: string | null;
};

const skills = [
    {
        group: 'Языки и фреймворки',
        accent: 'green' as const,
        items: ['--php', '--laravel', '--go', '--typescript', '--react'],
    },
    {
        group: 'Данные и инфраструктура',
        accent: 'cyan' as const,
        items: [
            '--postgresql',
            '--redis',
            '--rabbitmq',
            '--docker',
            '--kubernetes',
        ],
    },
    {
        group: 'Практики',
        accent: 'pink' as const,
        items: [
            '--ddd',
            '--rest-grpc',
            '--ci-cd',
            '--testing',
            '--observability',
        ],
    },
];

const approachLog = [
    [
        'OK',
        'Сначала контекст',
        'Разбираюсь, какую задачу бизнеса должна выдержать система.',
    ],
    [
        'OK',
        'Затем границы',
        'Делаю сложность видимой, у каждого модуля одна ответственность.',
    ],
    [
        'OK',
        'Потом код',
        'Простое решение, которое команда разовьёт без автора.',
    ],
] as const;

function ArrowUpRight() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4 fill-none stroke-current stroke-[1.5]"
        >
            <path d="M5 15 15 5M7 5h8v8" />
        </svg>
    );
}

function Cursor({ className = '' }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={`cursor-blink inline-block h-[1em] w-[0.55ch] translate-y-[0.1em] bg-[#39ff88] ${className}`}
        />
    );
}

const accentMap = {
    green: {
        text: 'text-[#39ff88]',
        border: 'border-[#39ff88]/35 hover:border-[#39ff88]',
        dot: 'bg-[#39ff88]',
    },
    pink: {
        text: 'text-[#ff5fa2]',
        border: 'border-[#ff5fa2]/35 hover:border-[#ff5fa2]',
        dot: 'bg-[#ff5fa2]',
    },
    cyan: {
        text: 'text-[#5fd3ff]',
        border: 'border-[#5fd3ff]/35 hover:border-[#5fd3ff]',
        dot: 'bg-[#5fd3ff]',
    },
};

export default function Welcome({ projects, profilePhoto }: WelcomeProps) {
    return (
        <>
            <Head title="Backend-разработчик · ifdancoder">
                <meta
                    name="description"
                    content="Проектирование и разработка надёжных backend-систем, API и сервисов. Laravel, Go, PostgreSQL."
                />
            </Head>

            <div className="scanlines min-h-screen bg-[#0a0e0f] font-mono text-[#e7f3ec] selection:bg-[#39ff88] selection:text-[#0a0e0f]">
                <header className="hero-enter border-b border-[#e7f3ec]/10">
                    <nav
                        aria-label="Основная навигация"
                        className="mx-auto flex h-20 max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-14"
                    >
                        <a
                            href="#top"
                            aria-label="На главную"
                            className="focus-ring rounded-sm text-sm tracking-tight sm:text-base"
                        >
                            <span className="text-[#e7f3ec]/55">
                                ifdancoder
                            </span>
                            <span className="text-[#39ff88]">@</span>
                            <span className="text-[#e7f3ec]/55">backend</span>
                            <span className="text-[#e7f3ec]/30">:~$</span>
                            <Cursor className="ml-1" />
                        </a>

                        <div className="hidden items-center gap-8 text-sm text-[#e7f3ec]/50 md:flex">
                            <a className="quiet-link" href="#projects">
                                ./projects
                            </a>
                            <a className="quiet-link" href="#stack">
                                ./stack
                            </a>
                            <a className="quiet-link" href="#contact">
                                ./contact
                            </a>
                        </div>

                        <a
                            href="#contact"
                            className="focus-ring group flex items-center gap-2 rounded-sm border border-[#39ff88]/40 px-4 py-2.5 text-sm text-[#39ff88] transition-colors hover:bg-[#39ff88] hover:text-[#0a0e0f]"
                        >
                            $ connect
                            <span className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                                <ArrowUpRight />
                            </span>
                        </a>
                    </nav>
                </header>

                <main id="top">
                    <section className="relative mx-auto max-w-[1480px] px-5 pt-16 pb-24 sm:px-8 sm:pt-24 lg:px-14 lg:pt-28 lg:pb-36">
                        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
                            <div className="hero-enter hero-enter-delay flex flex-col justify-center gap-9">
                                <p className="flex items-center gap-2 text-sm text-[#39ff88]">
                                    $ whoami
                                    <Cursor />
                                </p>
                                <h1 className="max-w-2xl text-[clamp(2.4rem,5.6vw,4.6rem)] leading-[1.05] font-normal tracking-[-0.02em]">
                                    Пишу backend, который не падает в 3 часа
                                    ночи.
                                </h1>
                                <p className="max-w-xl text-lg leading-relaxed text-[#e7f3ec]/55">
                                    Backend-разработчик из Иркутска. Проектирую
                                    API, очереди и модели данных для продуктов,
                                    которым нельзя останавливаться.
                                </p>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <a
                                        href="#projects"
                                        className="focus-ring glow-green rounded-sm border border-[#39ff88]/40 px-5 py-3 text-sm text-[#39ff88] transition-colors hover:bg-[#39ff88] hover:text-[#0a0e0f]"
                                    >
                                        Смотреть проекты
                                    </a>
                                    <a
                                        href="#contact"
                                        className="focus-ring rounded-sm border border-[#ff5fa2]/40 px-5 py-3 text-sm text-[#ff5fa2] transition-colors hover:bg-[#ff5fa2] hover:text-[#0a0e0f]"
                                    >
                                        Написать
                                    </a>
                                </div>
                            </div>

                            <div className="hero-enter hero-enter-late flex flex-col gap-5">
                                <div className="relative overflow-hidden rounded-md border border-[#e7f3ec]/12 bg-[#101515]">
                                    <div className="flex items-center justify-between border-b border-[#e7f3ec]/10 px-5 py-3 text-xs text-[#e7f3ec]/40">
                                        <span>profile.jpg</span>
                                        <span className="flex items-center gap-2">
                                            <span className="size-1.5 rounded-full bg-[#39ff88] shadow-[0_0_8px_1px_rgba(57,255,136,0.6)]" />
                                            online
                                        </span>
                                    </div>
                                    <div className="relative aspect-[4/5]">
                                        <img
                                            src={
                                                profilePhoto ??
                                                fallbackProfilePhoto
                                            }
                                            alt="Портрет backend-разработчика ifdancoder"
                                            className="h-full w-full object-cover contrast-[1.05] grayscale-[15%]"
                                            width={960}
                                            height={946}
                                        />
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0e0f] via-transparent to-[#39ff88]/15 mix-blend-overlay" />
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-md border border-[#e7f3ec]/12 bg-[#101515]">
                                    <div className="flex items-center justify-between border-b border-[#e7f3ec]/10 px-5 py-2.5 text-xs text-[#e7f3ec]/40">
                                        <span>status.sh</span>
                                        <span className="flex items-center gap-2">
                                            <span className="size-1.5 rounded-full bg-[#39ff88] shadow-[0_0_8px_1px_rgba(57,255,136,0.6)]" />
                                            online
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2 p-5 text-sm leading-relaxed">
                                        <p className="text-[#e7f3ec]/45">
                                            $ uptime
                                        </p>
                                        <p className="text-[#5fd3ff]">
                                            47d 12h · 99.98%
                                        </p>
                                        <p className="flex items-center gap-2 text-[#e7f3ec]/45">
                                            $<Cursor />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section
                        id="stack"
                        className="border-y border-[#e7f3ec]/10 bg-[#0d1113]"
                    >
                        <div className="mx-auto max-w-[1480px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
                            <p className="flex items-center gap-2 text-sm text-[#5fd3ff]">
                                $ ls -la ~/skills
                                <Cursor className="bg-[#5fd3ff]" />
                            </p>
                            <h2 className="mt-5 max-w-xl text-3xl leading-[1.15] font-normal tracking-[-0.02em] sm:text-4xl">
                                Инструменты, которыми закрываю задачи.
                            </h2>

                            <div className="mt-14 grid gap-10 sm:grid-cols-3">
                                {skills.map((group) => {
                                    const accent = accentMap[group.accent];
                                    return (
                                        <div key={group.group}>
                                            <p
                                                className={`mb-4 flex items-center gap-2 text-xs tracking-wide text-[#e7f3ec]/40 uppercase`}
                                            >
                                                <span
                                                    className={`size-1.5 rounded-full ${accent.dot}`}
                                                />
                                                {group.group}
                                            </p>
                                            <div className="flex flex-wrap gap-2.5">
                                                {group.items.map((item) => (
                                                    <span
                                                        key={item}
                                                        className={`rounded-sm border px-3 py-1.5 text-sm ${accent.text} ${accent.border} transition-colors`}
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <section
                        id="projects"
                        className="mx-auto max-w-[1480px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28"
                    >
                        <p className="flex items-center gap-2 text-sm text-[#ff5fa2]">
                            $ ls ~/projects
                            <Cursor className="bg-[#ff5fa2]" />
                        </p>
                        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
                            <h2 className="max-w-xl text-3xl leading-[1.15] font-normal tracking-[-0.02em] sm:text-4xl">
                                Что уже собрано.
                            </h2>
                            <p className="max-w-sm text-sm leading-relaxed text-[#e7f3ec]/40">
                                Пока здесь примеры. Контент редактируется в
                                админке, реальные кейсы скоро займут их место.
                            </p>
                        </div>

                        <div className="mt-14 grid gap-6 sm:grid-cols-3">
                            {projects.map((project) => (
                                <article
                                    key={project.slug}
                                    className="project-card flex flex-col overflow-hidden rounded-md border border-[#e7f3ec]/12 bg-[#101515]"
                                >
                                    <div className="flex items-center justify-between border-b border-[#e7f3ec]/10 px-4 py-2.5 text-xs text-[#e7f3ec]/40">
                                        <span>{project.slug}.log</span>
                                        <span className="rounded-sm border border-[#e7f3ec]/15 px-2 py-0.5 text-[10px] tracking-wide uppercase">
                                            {project.status}
                                        </span>
                                    </div>
                                    {project.image && (
                                        <img
                                            src={project.image}
                                            alt={project.title}
                                            className="aspect-video w-full object-cover contrast-[1.05] grayscale-[15%]"
                                        />
                                    )}
                                    <div className="flex grow flex-col gap-4 p-5">
                                        <h3 className="text-sm text-[#e7f3ec]">
                                            {project.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-[#e7f3ec]/65">
                                            {project.description}
                                        </p>
                                        <div className="mt-auto flex items-end justify-between gap-3">
                                            <p className="text-xs text-[#e7f3ec]/35">
                                                {project.stack}
                                            </p>
                                            {project.url && (
                                                <a
                                                    href={project.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="focus-ring quiet-link flex items-center gap-1 text-xs text-[#e7f3ec]/55"
                                                >
                                                    open
                                                    <ArrowUpRight />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="border-y border-[#e7f3ec]/10 bg-[#0d1113]">
                        <div className="mx-auto max-w-[1480px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
                            <p className="flex items-center gap-2 text-sm text-[#39ff88]">
                                $ cat approach.log
                                <Cursor />
                            </p>
                            <div className="mt-10 flex flex-col">
                                {approachLog.map(
                                    ([tag, title, description]) => (
                                        <div
                                            key={title}
                                            className="grid gap-4 border-t border-[#e7f3ec]/10 py-6 sm:grid-cols-[5rem_1fr] sm:items-baseline"
                                        >
                                            <span className="text-xs text-[#39ff88]">
                                                [{tag}]
                                            </span>
                                            <p className="text-sm leading-relaxed text-[#e7f3ec]/60 sm:text-base">
                                                <span className="text-[#e7f3ec]">
                                                    {title}:
                                                </span>{' '}
                                                {description}
                                            </p>
                                        </div>
                                    ),
                                )}
                                <div className="border-t border-[#e7f3ec]/10" />
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-[1480px] px-5 py-5 sm:px-8 sm:py-8 lg:px-14 lg:py-14">
                        <div
                            id="contact"
                            className="glow-green overflow-hidden rounded-md border border-[#39ff88]/40 bg-[#101515] p-8 sm:p-14 lg:p-20"
                        >
                            <p className="flex items-center gap-2 text-sm text-[#39ff88]">
                                $ contact --email
                                <Cursor />
                            </p>
                            <a
                                href="mailto:hello@ifdancoder.dev"
                                className="focus-ring group mt-6 flex max-w-fit items-center gap-4 text-3xl leading-tight tracking-[-0.02em] text-[#e7f3ec] sm:text-5xl"
                            >
                                hello@ifdancoder.dev
                                <span className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
                                    <ArrowUpRight />
                                </span>
                            </a>
                            <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#e7f3ec]/45 sm:text-base">
                                Открыт к предложениям о работе и интересным
                                проектам. Напишите, расскажу подробнее о себе и
                                опыте.
                            </p>
                            <div className="mt-10 flex flex-wrap gap-6 text-sm text-[#e7f3ec]/55">
                                <a
                                    className="quiet-link focus-ring"
                                    href="https://github.com/ifdancoder"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    --github
                                </a>
                                <a
                                    className="quiet-link focus-ring"
                                    href="https://t.me/ifdancoder"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    --telegram
                                </a>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="mx-auto flex max-w-[1480px] flex-col gap-4 px-5 py-8 text-xs text-[#e7f3ec]/35 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14 lg:py-10">
                    <span>© {new Date().getFullYear()} ifdancoder</span>
                    <span>laravel · inertia · react · tailwind</span>
                </footer>
            </div>
        </>
    );
}
