# Markdown style guide

Much of what makes Markdown refreshing is the ability to write plain text and get great formatted output as a result. To keep the slate clean for the next author, your Markdown should be simple and consistent with the whole corpus wherever possible.

We seek to balance three goals:

1.  _Source text is readable and portable._
2.  _The Markdown corpus is maintainable over time and across teams._
3.  _The syntax is simple and easy to remember._

Contents:

1.  [Philosophy](#philosophy)
    1.  [Radical simplicity](#radical-simplicity)
    1.  [Readable source text](#readable-source-text)
    1.  [Minimum viable documentation](#minimum-viable-documentation)
    1.  [Better is better than best](#better-is-better-than-best)
1.  [Capitalization](#capitalization)
1.  [Document layout](#document-layout)
1.  [Table of contents](#table-of-contents)
    1.  [Always use a contents list](#always-use-a-contents-list)
    1.  [Place the contents list after the introduction](#place-the-contents-list-after-the-introduction)
1.  [Line length](#line-length)
1.  [Trailing whitespace](#trailing-whitespace)
1.  [Headings](#headings)
    1.  [ATX-style headings](#atx-style-headings)
    1.  [Use unique, complete names for headings](#use-unique-complete-names-for-headings)
    1.  [Add spacing to headings](#add-spacing-to-headings)
    1.  [Use a single H1 heading](#use-a-single-h1-heading)
    1.  [Capitalization of titles and headers](#capitalization-of-titles-and-headers)
1.  [Lists](#lists)
    1.  [Use lazy numbering for long lists](#use-lazy-numbering-for-long-lists)
    1.  [Nested list spacing](#nested-list-spacing)
1.  [Code](#code)
    1.  [Inline code](#inline-code)
    1.  [Use code span for escaping](#use-code-span-for-escaping)
    1.  [Code blocks](#code-blocks)
        1.  [Declare the language](#declare-the-language)
        1.  [Use fenced code blocks instead of indented code blocks](#use-fenced-code-blocks-instead-of-indented-code-blocks)
        1.  [Escape newlines](#escape-newlines)
        1.  [Nest code blocks within lists](#nest-code-blocks-within-lists)
1.  [Links](#links)
    1.  [Use explicit paths for links within Markdown](#use-explicit-paths-for-links-within-markdown)
    1.  [Avoid relative paths unless within the same directory](#avoid-relative-paths-unless-within-the-same-directory)
    1.  [Use informative Markdown link titles](#use-informative-markdown-link-titles)
    1.  [Reference links](#reference-links)
        1.  [Use reference links for long links](#use-reference-links-for-long-links)
        1.  [Use reference links to reduce duplication](#use-reference-links-to-reduce-duplication)
        1.  [Define reference links after their first use](#define-reference-links-after-their-first-use)
1.  [Images](#images)
1.  [Tables](#tables)
1.  [Strongly prefer Markdown to HTML](#strongly-prefer-markdown-to-html)
1.  [Documentation best practices](#documentation-best-practices)
    1.  [Update docs with code](#update-docs-with-code)
    1.  [Delete dead documentation](#delete-dead-documentation)
    1.  [Documentation is the story of your code](#documentation-is-the-story-of-your-code)
    1.  [Duplication is evil](#duplication-is-evil)
1.  [See also](#see-also)

## Philosophy

埏埴以為器，當其無，有器之用.

_Clay becomes pottery through craft, but it's the emptiness that makes a pot useful._

\- Laozi

### Radical simplicity

- **Scalability and interoperability** are more important than a menagerie of unessential features. Scale comes from simplicity, speed, and ease. Interoperability comes from unadorned, digestible content.

- **Fewer distractions** make for better writing and more productive reading.

- **New features should never interfere with the simplest use case** and should remain invisible to users who don't need them.

- **Markdown is designed for the average engineer** -- the busy, just-want-to-go-back-to-coding engineer. Large and complex documentation is possible but not the primary focus.

- **Minimizing context switching makes people happier.** Engineers should be able to interact with documentation using the same tools they use to read and write code.

### Readable source text

- **Plain text not only suffices, it is superior**. Markdown itself is not essential to this formula, but it is the best and most widely supported solution right now. HTML is generally [not encouraged](#strongly-prefer-markdown-to-html).

- **Content and presentation should not mingle**. It should always be possible to ditch the renderer and read the essential information at source. Users should never have to touch the presentation layer if they don't want to.

- **Portability and future-proofing leave room for the unimagined integrations to come**, and are best achieved by keeping the source as human-readable as possible.

- **Static content is better than dynamic**, because content should not depend on the features of any one server. However, **fresh is better than stale**. We strive to balance these needs.

### Minimum viable documentation

A small set of fresh and accurate docs is better than a sprawling, loose assembly of "documentation" in various states of disrepair.

- **Docs thrive when they're treated like tests**: a necessary chore one learns to savor because it rewards over time. The Markdown way encourages engineers to take ownership of their docs and keep them up to date with the same zeal we keep our tests in good order. See [Documentation best practices](#documentation-best-practices).

- **Brief and utilitarian is better than long and exhaustive**. The vast majority of users need only a small fraction of the author's total knowledge, but they need it quickly and often.

Write short and useful documents. Identify what you really need: release docs, API docs, testing guidelines. Cut out everything unnecessary, including out-of-date, incorrect, or redundant information, and delete cruft frequently and in small batches. Make a habit of continually massaging and improving every doc to suit your changing needs. **Docs work best when they are alive but frequently trimmed, like a bonsai tree**.

See also [these Agile Documentation best practices](https://www.agilemodeling.com/essays/agileDocumentationBestPractices.htm).

### Better is better than best

Documentation is an art. There is no perfect document, there are only proven methods and prudent guidelines.

- **Incremental improvement is better than prolonged debate**. Patience and tolerance of imperfection allow projects to evolve organically.

- **Don't [lick the cookie](https://www.redhat.com/en/blog/dont-lick-cookie), pass the plate**. Ideas are cheap. We're drowning in potentially impactful projects. Choose only those you can really handle and release those you can't.

The standards for a documentation review are different from the standards for code reviews. Reviewers should ask for improvements, but in general, the author should always be able to invoke the "Better/Best Rule."

Fast iteration is your friend. To get long-term improvement, **authors must stay productive** when making short-term improvements. Set lower standards for each change, so that **more such changes** can happen.

As a reviewer of a documentation change:

1.  When reasonable, approve immediately and trust that comments will be fixed appropriately.
2.  Prefer to suggest an alternative rather than leaving a vague comment.
3.  For substantial changes, start your own follow-up change instead. Especially try to avoid comments of the form "You should _also_...".
4.  On rare occasions, hold up submission if the change actually makes the docs worse. It's okay to ask the author to revert.

As an author:

1.  Avoid wasting cycles with trivial argument. Capitulate early and move on.
2.  Cite the Better/Best Rule as often as needed.

## Capitalization

Use the original names of products, tools and binaries, preserving the capitalization. E.g.:

```markdown
# Markdown style guide

`Markdown` is a dead-simple platform for internal engineering documentation.
```

and not

```markdown
# markdown bad style guide example

`markdown` is a dead-simple platform for internal engineering documentation.
```

## Document layout

In general, documents benefit from some variation of the following layout:

```markdown
# Document title

Short introduction.

Contents:

1.  [Topic](#topic)
1.  [See also](#see-also)

## Topic

Content.

## See also

- https://link-to-more-info
```

1.  `# Document title`: The first heading should be a level-one heading, ideally the same or nearly the same as the filename. The first level-one heading is used as the page `<title>`.

1.  `author`: _Optional_. If you'd like to claim ownership of the document or if you are very proud of it, add yourself under the title. However, revision history generally suffices.

1.  `Short introduction.` 1–3 sentences providing a high-level overview of the topic. Imagine yourself as a complete newbie who landed on your "Extending Foo" doc and doesn't know the most basic information you take for granted. "What is Foo? Why would I extend it?"

1.  `Contents:` A list of links to the document's headings, right after the short introduction. See [Table of contents](#table-of-contents).

1.  `## Topic`: The rest of your headings should start from level 2.

1.  `## See also`: Put miscellaneous links at the bottom for the user who wants to know more or didn't find what they needed.

## Table of contents

### Always use a contents list

Always include a table of contents, written as a plain Markdown list: a `Contents:` line followed by links to the document's headings. Don't use a `[TOC]` directive; it works only on hosts that support it and shows up as literal text everywhere else, while a list renders the same everywhere and reads well in source.

Link every heading below the H1. Nest subheadings under their parent with a 4-space indent, and use [lazy numbering](#use-lazy-numbering-for-long-lists):

```markdown
Contents:

1.  [Headings](#headings)
    1.  [ATX-style headings](#atx-style-headings)
    1.  [Use unique, complete names for headings](#use-unique-complete-names-for-headings)
1.  [Lists](#lists)
```

Update the list whenever you add, rename, move, or remove a heading. A stale entry is a broken link.

### Place the contents list after the introduction

Place the contents list after your page's introduction and before the first H2 heading. For example:

```markdown
# My Page

This is my introduction **before** the contents list.

Contents:

1.  [My first H2](#my-first-h2)

## My first H2
```

```markdown
# My Page

Contents:

1.  [My first H2](#my-first-h2)

This is my introduction **after** the contents list where it should not be.

## My first H2
```

The list renders exactly where you place it, for sighted readers, screen readers, and keyboard users alike. After the introduction, it lets readers confirm they're on the right page before jumping to a section. If, for example, you place it at the very bottom of your file, screen readers won't read it until they get to the end of the document.

## Line length

There is no line length limit. Write each paragraph and list item on a single line and let your editor soft-wrap it; don't hard-wrap at a fixed column. Nothing needs rewrapping after an edit, and long links and tables never need special handling. For a deliberate line break, see [Trailing whitespace](#trailing-whitespace).

## Trailing whitespace

Don't use trailing whitespace. Use a trailing backslash to break lines.

The [CommonMark spec](https://spec.commonmark.org/0.31.2/#hard-line-breaks) decrees that two spaces at the end of a line should insert a `<br />` tag. However, many repositories have checks that reject trailing whitespace, and many IDEs will clean it up anyway.

Use a trailing backslash, sparingly:

```markdown
For some reason I just really want a break here,\
though it's probably not necessary.
```

Best practice is to avoid the need for a `<br />` altogether. A pair of newlines will create a paragraph tag; get used to that.

## Headings

### ATX-style headings

```markdown
# Heading 1

## Heading 2
```

Headings with `=` or `-` underlines can be annoying to maintain and don't fit with the rest of the heading syntax. An editor has to ask: Does `---` mean H1 or H2?

```markdown
Heading - do you remember what level? DO NOT DO THIS.
---------
```

### Use unique, complete names for headings

Use unique and fully descriptive names for each heading, even for sub-sections. Since link anchors are constructed from headings, this helps ensure that the automatically-constructed anchor links, including those in your contents list, are intuitive and clear.

For example, instead of:

```markdown
## Foo

### Summary

### Example

## Bar

### Summary

### Example
```

prefer:

```markdown
## Foo

### Foo summary

### Foo example

## Bar

### Bar summary

### Bar example
```

### Add spacing to headings

Prefer spacing after `#` and newlines before and after:

```markdown
...text before.

## Heading 2

Text after...
```

Lack of spacing makes it a little harder to read in source:

```markdown
...text before.

##Heading 2
Text after... DO NOT DO THIS.
```

### Use a single H1 heading

Use one H1 heading as the title of your document. Subsequent headings should be H2 or deeper. See [Document layout](#document-layout) for more information.

### Capitalization of titles and headers

Follow the guidance for [capitalization](https://developers.google.com/style/capitalization#capitalization-in-titles-and-headings) in the [Google Developer Documentation Style Guide](https://developers.google.com/style/).

## Lists

### Use lazy numbering for long lists

Markdown is smart enough to let the resulting HTML render your numbered lists correctly. For longer lists that may change, especially long nested lists, use "lazy" numbering:

```markdown
1.  Foo.
1.  Bar.
    1.  Foofoo.
    1.  Barbar.
1.  Baz.
```

However, if the list is small and you don't anticipate changing it, prefer fully numbered lists, because it's nicer to read in source:

```markdown
1.  Foo.
2.  Bar.
3.  Baz.
```

### Nested list spacing

When nesting lists, use a 4-space indent for both numbered and bulleted lists:

```markdown
1.  Use 2 spaces after the item number, so the text itself is indented 4 spaces.
2.  Use 2 spaces again for the next item.

    Indent a continuation paragraph 4 spaces, aligned with the item text.

- Use 3 spaces after a bullet, so the text itself is indented 4 spaces.
  1.  Use 2 spaces with numbered lists, as before.

      A continuation paragraph in a nested list needs an 8-space indent.

  2.  Looks nice, doesn't it?
- Back to the bulleted list, indented 3 spaces.
```

The following works, but it's very messy:

```markdown
- One space, with no alignment.
  1.  Irregular nesting... DO NOT DO THIS.
```

Even when there's no nesting, using the 4-space indent keeps continuation paragraphs and code blocks aligned with the item text:

```markdown
- Foo.

  A second paragraph, indented 4 spaces.

1.  Two spaces for the list item.

    A second paragraph, indented 4 spaces.

2.  Back to 2 spaces.
```

However, when lists are small, not nested, and each item is a single short line, one space can suffice for both kinds of lists:

```markdown
- Foo
- Bar
- Baz.

1. Foo.
2. Bar.
```

## Code

### Inline code

Backticks (`` ` ``) designate `inline code` that will be rendered literally. Use them for short code quotations, field names, and more:

```markdown
You'll want to run `really_cool_script.sh arg`.

Pay attention to the `foo_bar_whammy` field in that table.
```

Use inline code when referring to file types in a generic sense, rather than a specific existing file:

```markdown
Be sure to update your `README.md`!
```

### Use code span for escaping

When you don't want text to be processed as normal Markdown, like a fake path or example URL that would lead to a bad autolink, wrap it in backticks:

```markdown
An example Markdown shortlink would be: `Markdown/foo/Markdown/bar.md`

An example query might be: `https://www.google.com/search?q=$TERM`
```

### Code blocks

For code quotations longer than a single line, use a fenced code block:

````markdown
```python
def Foo(self, bar):
  self.bar = bar
```
````

#### Declare the language

It is best practice to explicitly declare the language, so that neither the syntax highlighter nor the next editor must guess.

#### Use fenced code blocks instead of indented code blocks

Four-space indenting is also interpreted as a code block. However, we strongly recommend fencing for all code blocks.

Indented code blocks can sometimes look cleaner in the source, but they have several drawbacks:

- You cannot specify the language. Some Markdown features are tied to language specifiers.
- The beginning and end of the code block are ambiguous.
- Indented code blocks are harder to search for.

```markdown
DO NOT DO THIS.

You'll need to run:

    bazel run :thing -- --foo

And then:

    bazel run :another_thing -- --bar

And again:

    bazel run :yet_again -- --baz
```

#### Escape newlines

Because most command-line snippets are intended to be copied and pasted directly into a terminal, it's best practice to escape any newlines. Use a single backslash at the end of the line:

````markdown
```shell
$ bazel run :target -- --flag --foo=longlonglonglonglongvalue \
  --bar=anotherlonglonglonglonglonglonglonglonglonglongvalue
```
````

#### Nest code blocks within lists

If you need a code block within a list, make sure to indent it so as to not break the list:

````markdown
- Bullet.

  ```c++
  int foo;
  ```

- Next bullet.
````

Indenting 4 additional spaces from the list indentation also creates a code block, but an indented one with all the drawbacks above, so prefer the fence.

## Links

Long links make source Markdown difficult to read. **Wherever possible, shorten your links**.

### Use explicit paths for links within Markdown

Use the explicit path for Markdown links. For example:

```markdown
[...](/path/to/other/markdown/page.md)
```

You don't need to use the entire qualified URL:

```markdown
[...](https://bad-full-url.example.com/path/to/other/markdown/page.md)
```

### Avoid relative paths unless within the same directory

Relative paths are fairly safe within the same directory. For example:

```markdown
[...](other-page-in-same-dir.md)
[...](/path/to/another/dir/other-page.md)
```

Avoid relative links if you need to specify other directories with `../`:

```markdown
[...](../../bad/path/to/another/dir/other-page.md)
```

### Use informative Markdown link titles

Markdown link syntax allows you to set a link title. Use it wisely. Users often do not read documents; they scan them.

Links catch the eye. But titling your links "here," "link," or simply duplicating the target URL tells the hasty reader precisely nothing and is a waste of space:

```markdown
DO NOT DO THIS.

See the Markdown guide for more info: [link](markdown.md), or check out the style guide [here](style.md).

Check out a typical test result: [https://example.com/foo/bar](https://example.com/foo/bar).
```

Instead, write the sentence naturally, then go back and wrap the most appropriate phrase with the link:

```markdown
See the [Markdown guide](markdown.md) for more info, or check out the [style guide](style.md).

Check out a [typical test result](https://example.com/foo/bar).
```

### Reference links

For long links or image URLs, you may want to split the link use from the link definition, like this:

```markdown
See the [Markdown style guide][style], which has suggestions for making docs more readable.

[style]: https://example.com/markdown/docs/reference/style.md
```

#### Use reference links for long links

Use reference links where the length of the link would detract from the readability of the surrounding text if it were inlined. Reference links make it harder to see the destination of a link in source text, and add additional syntax.

In this example, reference link usage is not appropriate, because the link is not long enough to disrupt the flow of the text:

```markdown
DO NOT DO THIS.

The [style guide][style_guide] says not to use reference links unless you have to.

[style_guide]: https://google.com/Markdown-style
```

Just inline it instead:

```markdown
The [style guide](https://google.com/Markdown-style) says not to use reference links unless you have to.
```

In this example, the link destination is long enough that it makes sense to use a reference link:

```markdown
The [style guide] says not to use reference links unless you have to.

[style guide]: https://docs.google.com/document/d/13HQBxfhCwx8lVRuN2Wf6poqvAfVeEXmFVcawP5I6B3c/edit
```

Use reference links more often in tables. It is particularly important to keep table content short, since Markdown does not provide a facility to break text in cell tables across multiple lines, and smaller tables are more readable.

For example, this table's readability is worsened by inline links:

```markdown
DO NOT DO THIS.

| Site                                                             | Description             |
| ---------------------------------------------------------------- | ----------------------- |
| [site 1](http://google.com/excessively/long/path/example_site_1) | This is example site 1. |
| [site 2](http://google.com/excessively/long/path/example_site_2) | This is example site 2. |
```

Instead, use reference links to keep the table compact:

```markdown
| Site     | Description             |
| -------- | ----------------------- |
| [site 1] | This is example site 1. |
| [site 2] | This is example site 2. |

[site 1]: http://google.com/excessively/long/path/example_site_1
[site 2]: http://google.com/excessively/long/path/example_site_2
```

#### Use reference links to reduce duplication

Consider using reference links when referencing the same link destination multiple times in a document, to reduce duplication.

#### Define reference links after their first use

We recommend putting reference link definitions just before the next heading, at the end of the section in which they're first used. If your editor has its own opinion about where they should go, don't fight it; the tools always win.

We define a "section" as all text between two headings. Think of reference links like footnotes, and the current section like the current page.

This arrangement makes it easy to find the link destination in source view, while keeping the flow of text free from clutter. In long documents with lots of reference links, it also prevents "footnote overload" at the bottom of the file, which makes it difficult to pick out the relevant link destination.

There is one exception to this rule: reference link definitions that are used in multiple sections should go at the end of the document. This avoids dangling links when a section is updated or moved.

In the following example, the reference definition is far from its initial use, which makes the document harder to read:

```markdown
# Header FOR A BAD DOCUMENT

Some text with a [link][link_def].

Some more text with the same [link][link_def].

## Header 2

... lots of text ...

## Header 3

Some more text using a [different_link][different_link_def].

[link_def]: http://reallyreallyreallylonglink.com
[different_link_def]: http://differentreallyreallylonglink.com
```

Instead, put it just before the header following its first use:

```markdown
# Header

Some text with a [link][link_def].

Some more text with the same [link][link_def].

[link_def]: http://reallyreallyreallylonglink.com

## Header 2

... lots of text ...

## Header 3

Some more text using a [different_link][different_link_def].

[different_link_def]: http://differentreallyreallylonglink.com
```

## Images

See [image syntax](https://spec.commonmark.org/0.31.2/#images).

Use images sparingly, and prefer simple screenshots. This guide is designed around the idea that plain text gets users down to the business of communication faster with less reader distraction and author procrastination. However, it's sometimes very helpful to show what you mean.

- Use images when it's easier to _show_ a reader something than to _describe it_. For example, explaining how to navigate a UI is often easier with an image than text.
- Make sure to provide appropriate text to describe your image. Readers who are not sighted cannot see your image and still need to understand the content!

Put that description in the image's alt text:

```markdown
![Settings page with the Advanced tab selected](/docs/images/settings-advanced.png)
```

## Tables

Use tables when they make sense: for the presentation of tabular data that needs to be scanned quickly.

Avoid using tables when your data could easily be presented in a list. Lists are much easier to write and read in Markdown.

For example:

```markdown
DO NOT DO THIS.

| Fruit  | Metrics      | Grows on | Acute curvature    | Attributes                                                                                                            | Notes                                                                                                                                 |
| ------ | ------------ | -------- | ------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Apple  | Very popular | Trees    |                    | [Juicy](https://example.com/SomeReallyReallyReallyReallyReallyReallyReallyReallyLongQuery), Firm, Sweet               | Apples keep doctors away.                                                                                                             |
| Banana | Very popular | Trees    | 16 degrees average | [Convenient](https://example.com/SomeDifferentReallyReallyReallyReallyReallyReallyReallyReallyLongQuery), Soft, Sweet | Contrary to popular belief, most apes prefer mangoes. Don't you? See the [design doc][banana_v2] for the newest hotness in bananiels. |
```

This table illustrates a few typical problems:

- **Poor distribution**: Several columns don't differ across rows, and some cells are empty. This is usually a sign that your data may not benefit from tabular display.

- **Unbalanced dimensions**: There are a small number of rows relative to columns. When this ratio is unbalanced in either direction, a table becomes little more than an inflexible format for text.

- **Rambling prose** in some cells. Tables should tell a succinct story at a glance.

[Lists](#lists) and subheadings sometimes suffice to present the same information. Let's see this data in list form:

```markdown
## Fruits

Both types are highly popular, sweet, and grow on trees.

### Apple

- [Juicy](https://example.com/SomeReallyReallyReallyReallyReallyReallyReallyReallyLongQuery)
- Firm

Apples keep doctors away.

### Banana

- [Convenient](https://example.com/SomeDifferentReallyReallyReallyReallyReallyReallyReallyReallyLongQuery)
- Soft
- 16 degrees average acute curvature.

Contrary to popular belief, most apes prefer mangoes. Don't you?

See the [design doc][banana_v2] for the newest hotness in bananiels.
```

The list form is more spacious, and arguably therefore much easier for the reader to find what interests them in this case.

However, there are times a table is the best choice. When you have:

- Relatively uniform data distribution across two dimensions.
- Many parallel items with distinct attributes.

In those cases, a table format is just the thing. In fact, a compact table can improve readability:

```markdown
| Transport        | Favored by     | Advantages                                       |
| ---------------- | -------------- | ------------------------------------------------ |
| Swallow          | Coconuts       | [Fast when unladen][airspeed]                    |
| Bicycle          | Miss Gulch     | [Weatherproof][tornado_proofing]                 |
| X-34 landspeeder | Whiny farmboys | [Cheap][tosche_station] since the XP-38 came out |

[airspeed]: https://example.com/airspeed.h
[tornado_proofing]: https://example.com/kansas/
[tosche_station]: https://example.com/power_converter.h
```

Note that [reference links](#reference-links) are used to keep the table cells manageable.

## Strongly prefer Markdown to HTML

Please prefer standard Markdown syntax wherever possible and avoid HTML hacks. If you can't seem to accomplish what you want, reconsider whether you really need it. Except for [big tables](#tables), Markdown meets almost all needs already.

Every bit of HTML hacking reduces the readability and portability of our Markdown corpus. This in turn limits the usefulness of integrations with other tools, which may either present the source as plain text or render it. See [Philosophy](#philosophy).

Some renderers, such as Gitiles, don't render HTML at all.

## Documentation best practices

"Say what you mean, simply and directly." - [Brian Kernighan](https://en.wikipedia.org/wiki/The_Elements_of_Programming_Style)

### Update docs with code

**Update your documentation in the same commit or pull request as the code**. This keeps your docs fresh, and is also a good place to explain to your reviewer what you're doing.

A good reviewer can at least insist that docstrings, header files, `README.md` files, and any other docs get updated alongside the code.

### Delete dead documentation

Dead docs are bad. They misinform, they slow down, they incite despair in engineers and laziness in team leads. They set a precedent for leaving behind messes in a code base. If your home is clean, most guests will be clean without being asked.

Just like any big cleaning project, **it's easy to be overwhelmed**. If your docs are in bad shape:

- Take it slow, doc health is a gradual accumulation.
- First delete what you're certain is wrong, ignore what's unclear.
- Get your whole team involved. Devote time to quickly scan every doc and make a simple decision: Keep or delete?
- Default to delete or leave behind if migrating. Stragglers can always be recovered.
- Iterate.

### Documentation is the story of your code

Writing excellent code doesn't end when your code compiles or even if your test coverage reaches 100%. It's easy to write something a computer understands, it's much harder to write something both a human and a computer understand. Your mission as a code health-conscious engineer is to **write for humans first, computers second.** Documentation is an important part of this skill.

There's a spectrum of engineering documentation that ranges from terse comments to detailed prose:

1.  **Meaningful names**: Good naming allows the code to convey information that would otherwise be relegated to comments or documentation. This includes nameable entities at all levels, from local variables to classes, files, and directories.

2.  **Inline comments**: The primary purpose of inline comments is to provide information that the code itself cannot contain, such as why the code is there.

3.  **Method and class comments**:

    - **Method API documentation**: The header / Javadoc / docstring comments that say what methods do and how to use them. This documentation is **the contract of how your code must behave**. The intended audience is future programmers who will use and modify your code.

      It is often reasonable to say that any behavior documented here should have a test verifying it. This documentation details what arguments the method takes, what it returns, any "gotchas" or restrictions, and what exceptions it can throw or errors it can return. It does not usually explain why code behaves a particular way unless that's relevant to a developer's understanding of how to use the method. "Why" explanations are for inline comments. Think in practical terms when writing method documentation: "This is a hammer. You use it to pound nails."

    - **Class / Module API documentation**: The header / Javadoc / docstring comments for a class or a whole file. This documentation gives a brief overview of what the class / file does and often gives a few short examples of how you might use the class / file.

      Examples are particularly relevant when there are several distinct ways to use the class (some advanced, some simple). Always list the simplest use case first.

4.  **`README.md`**: A good `README.md` orients the new user to the directory and points to more detailed explanation and user guides:

    - What is this directory intended to hold?
    - Which files should the developer look at first? Are some files an API?
    - Who maintains this directory and where can I learn more?

5.  **`docs`**: The contents of a good `docs` directory explain how to:

    - Get started using the relevant API, library, or tool.
    - Run its tests.
    - Debug its output.
    - Release the binary.

6.  **Design docs, PRDs**: A good design doc or PRD discusses the proposed implementation at length for the purpose of collecting feedback on that design. However, once the code is implemented, design docs should serve as archives of these decisions, not as half-correct docs (they are often misused).

7.  **Other external docs**: Some teams maintain documentation in other locations, separate from the code, such as Google Sites, Drive, or wiki. If you do maintain documentation in other locations, you should clearly point to those locations from your project directory (for example, by adding an obvious link to the location from your project's `README.md`).

### Duplication is evil

Do not write your own guide to a common technology or process. Link to it instead. If the guide doesn't exist or it's badly out of date, submit your updates to the appropriate directory or create a package-level `README.md`. **Take ownership and don't be shy**: Other teams will usually welcome your contributions.

## See also

- [Google documentation guide](https://github.com/google/styleguide/tree/gh-pages/docguide) (version 2.0), the source of this guide, licensed under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). This synthesis merges its style, best practices, and philosophy pages; drops the 80-character line limit in favor of unlimited line length; and replaces the `[TOC]` directive with a contents list.
- [Google developer documentation style guide](https://developers.google.com/style/)
- [CommonMark spec](https://spec.commonmark.org/)
