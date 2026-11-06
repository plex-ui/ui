/** A copyable mobile Page composition: a phone Toolbar on top, the scrolling body, and the action in a bottom Toolbar on a phone or the Page footer from 768px up. */
export function formScreenTemplate(title: string, content: string, submitLabel?: string, submit = '', noValidate = false) {
  return `<Page surface="grouped" class="h-dvh" data-form-screen style="--page-content-padding-top:10px; --page-content-padding-bottom:16px; --page-footer-gutter:24px; --page-footer-padding-bottom:max(24px, env(safe-area-inset-bottom, 0px))">
  <Toolbar>
    <ToolbarLeading><DemoBackButton /></ToolbarLeading>
    <ToolbarTitle>${title}</ToolbarTitle>
  </Toolbar>
  <PageContent data-form-content>
    <form ref="screenForm" class="flex flex-col gap-6" @submit.prevent="${submit}" ${noValidate ? 'novalidate' : ''}>
      ${content}
    </form>
  </PageContent>
  ${submitLabel ? `<PageFooter data-form-footer><Button color="primary" size="3xl" pill block @click="$refs.screenForm.requestSubmit()">${submitLabel}</Button></PageFooter>
  <Toolbar placement="bottom"><ToolbarContent fill><Button color="primary" pill block @click="$refs.screenForm.requestSubmit()">${submitLabel}</Button></ToolbarContent></Toolbar>` : ''}
</Page>`;
}
