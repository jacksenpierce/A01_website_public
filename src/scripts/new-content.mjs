import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

function usage() {
  console.log(`Usage:\n  node src/scripts/new-content.mjs <type> [options] "Title"\n\nTypes:\n  blog    Create a new blog post stub\n  lab     Create a new lab notebook entry stub\n\nExamples:\n  npm run new:blog -- "Aligning the build"\n  npm run new:lab -- --id NR-LAB-007 "Evaluate deployment cache"\n`);
  process.exit(1);
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseArgs(args) {
  const options = {};
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, explicit] = arg.slice(2).split('=');
      if (explicit !== undefined) {
        options[key] = explicit;
      } else {
        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
          options[key] = next;
          i += 1;
        } else {
          options[key] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }
  return { options, positional };
}

async function ensureNotExists(targetPath) {
  try {
    await fs.access(targetPath);
    console.error(`Refusing to overwrite existing file: ${path.relative(rootDir, targetPath)}`);
    process.exit(1);
  } catch {
    // OK
  }
}

async function createBlogStub(title, options) {
  if (!title) {
    console.error('A title is required for blog posts.');
    process.exit(1);
  }
  const slug = options.slug ? slugify(options.slug) : slugify(title);
  const date = options.date ? new Date(options.date) : new Date();
  const category = options.category || 'Update';
  const description = options.description || 'TODO: add a short description for listings and search.';
  const summary = options.summary || 'TODO: add a summary for the blog card.';
  const tags = (options.tags || 'todo').split(',').map((tag) => tag.trim()).filter(Boolean);

  const frontMatter = `---\ntitle: ${title}\nslug: ${slug}\ndate: ${date.toISOString().slice(0, 10)}\ncategory: ${category}\ndescription: ${description}\nsummary: ${summary}\ntags:\n${tags.map((tag) => `  - ${tag}`).join('\n')}\nrelated: []\n---\n`;

  const body = `${frontMatter}\nWrite your post content here in Markdown.\n`;
  const target = path.join(rootDir, 'src', 'content', 'blog', `${slug}.md`);
  await ensureNotExists(target);
  await fs.writeFile(target, body);
  console.log(`Created blog post stub at src/content/blog/${slug}.md`);
}

async function createLabStub(title, options) {
  if (!title) {
    console.error('A title is required for lab entries.');
    process.exit(1);
  }
  if (!options.id) {
    console.error('Provide a lab identifier with --id (for example --id NR-LAB-007).');
    process.exit(1);
  }
  const slug = options.slug ? slugify(options.slug) : slugify(title);
  const logged = options.logged ? new Date(options.logged) : new Date();
  const status = options.status || 'Planned';
  const description = options.description || 'TODO: add a short description for listings and search.';
  const tags = (options.tags || 'todo').split(',').map((tag) => tag.trim()).filter(Boolean);

  const frontMatter = `---\nid: ${options.id}\nslug: ${slug}\ntitle: ${title}\nlogged: ${logged.toISOString().slice(0, 10)}\nstatus: ${status}\ndescription: ${description}\ntags:\n${tags.map((tag) => `  - ${tag}`).join('\n')}\nrelated: []\nfields:\n  aim: TODO\n  method: TODO\n  observations: TODO\n  result: TODO\n  next: TODO\nsummary: TODO\n---\n`;

  const target = path.join(rootDir, 'src', 'content', 'lab', `${slug}.md`);
  await ensureNotExists(target);
  await fs.writeFile(target, frontMatter + '\n');
  console.log(`Created lab entry stub at src/content/lab/${slug}.md`);
}

async function run() {
  const [type, ...rest] = process.argv.slice(2);
  if (!type) {
    usage();
  }

  const { options, positional } = parseArgs(rest);
  const title = positional.join(' ').trim();

  if (type === 'blog') {
    await createBlogStub(title, options);
    return;
  }

  if (type === 'lab') {
    await createLabStub(title, options);
    return;
  }

  console.error(`Unsupported type: ${type}`);
  usage();
}

run();
