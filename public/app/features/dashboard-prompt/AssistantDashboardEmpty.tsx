import { css } from '@emotion/css';
import { useCallback, useId } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Trans, t } from '@grafana/i18n';
import { reportInteraction } from '@grafana/runtime';
import { Box, Button, Combobox, type ComboboxOption, Icon, Stack, Text, useStyles2 } from '@grafana/ui';
import { type DashboardScene } from 'app/features/dashboard-scene/scene/DashboardScene';
import { AutoGridLayoutManager } from 'app/features/dashboard-scene/scene/layout-auto-grid/AutoGridLayoutManager';
import { DefaultGridLayoutManager } from 'app/features/dashboard-scene/scene/layout-default/DefaultGridLayoutManager';

import { DashboardLandingPrompt } from './DashboardLandingPrompt';
import { getPromptDatasources } from './datasources';
import { startPlanningInAssistant } from './handoff';
import { type DashboardLandingPromptSelection } from './types';

interface Props {
  dashboard: DashboardScene;
}

type LayoutValue = 'auto' | 'custom';

export function AssistantDashboardEmpty({ dashboard }: Props) {
  const styles = useStyles2(getStyles);
  const gridLabelId = useId();
  const { sidebar, body } = dashboard.useState();
  const isAutoGrid = body instanceof AutoGridLayoutManager;

  const onSelectAutoGrid = () => {
    dashboard.switchLayout(AutoGridLayoutManager.createEmpty());
    dashboard.updateDefaultLayoutTemplate(AutoGridLayoutManager.createEmpty());
  };

  const onSelectCustomGrid = () => {
    dashboard.switchLayout(DefaultGridLayoutManager.createEmpty());
    dashboard.updateDefaultLayoutTemplate(DefaultGridLayoutManager.createEmpty());
  };

  const onLayoutChange = (option: ComboboxOption<LayoutValue>) => {
    if (option.value === 'auto') {
      onSelectAutoGrid();
      return;
    }
    onSelectCustomGrid();
  };

  const onAddVisualization = () => {
    sidebar.addNewPanel(sidebar.getSelectedObject());
  };

  const onSubmitPrompt = useCallback(
    (prompt: string, selection: DashboardLandingPromptSelection[]) => {
      const selectedDatasources = selection
        .filter((item) => item.kind === 'datasource')
        .map((item) => ({
          uid: item.uid,
          type: item.datasourceType ?? 'unknown',
          name: item.name,
        }));
      const dashboards = selection
        .filter((item) => item.kind === 'dashboard')
        .map((item) => ({ uid: item.uid, title: item.name }));
      const folders = selection
        .filter((item) => item.kind === 'folder')
        .map((item) => ({ uid: item.uid, title: item.name }));

      const started = startPlanningInAssistant({
        request: prompt,
        displayPrompt: prompt,
        datasources: selectedDatasources.length > 0 ? selectedDatasources : getPromptDatasources(),
        dashboards,
        folders,
        folderUid: dashboard.state.meta.folderUid,
        skipNavigation: true,
      });

      if (started) {
        reportInteraction('dashboard_prompt_planning_started', { source: 'empty_state' });
      }
    },
    [dashboard]
  );

  const layoutOptions: Array<ComboboxOption<LayoutValue>> = [
    { label: t('dashboard.empty.grid-auto', 'Auto'), value: 'auto' },
    { label: t('dashboard.empty.grid-custom', 'Custom'), value: 'custom' },
  ];

  return (
    <Stack
      alignItems="stretch"
      justifyContent="center"
      direction="column"
      gap={4}
      width="100%"
    >
      <Stack alignItems="center" direction="column" gap={2}>
        <div className={styles.appsIconWrap}>
          <Icon name="apps" size="xxl" className={styles.appsIcon} />
        </div>
        <div className={styles.prompt}>
          <DashboardLandingPrompt onSubmit={onSubmitPrompt} />
        </div>
      </Stack>

      <Stack alignItems="center" height={4}>
        <div className={styles.orLine} />
        <Text color="secondary">
          <Trans i18nKey="dashboard.empty.or-start-blank">Or start blank</Trans>
        </Text>
        <div className={styles.orLine} />
      </Stack>

      <div>
        <Text element="h2" variant="h5" weight="medium">
          <Trans i18nKey="dashboard.empty.add-visualization-heading">Add a visualization</Trans>
        </Text>
        <Box marginTop={0.5} marginBottom={2}>
          <Text element="p" variant="bodySmall" color="secondary">
            <Trans i18nKey="dashboard.empty.add-visualization-description">
              Visualizations are panels for your data. Organize them with Auto grid or Custom grid.
            </Trans>
          </Text>
        </Box>
        <Stack alignItems="center" gap={1}>
          <Button
            size="sm"
            icon="plus"
            variant="secondary"
            data-testid={selectors.pages.AddDashboard.itemButton('Create new panel button')}
            onClick={onAddVisualization}
          >
            <Trans i18nKey="dashboard.empty.add-visualization-button">Add visualization</Trans>
          </Button>
          <Text element="span" variant="bodySmall" color="secondary" id={gridLabelId}>
            <Trans i18nKey="dashboard.empty.grid-label">Grid:</Trans>
          </Text>
          <Combobox
            options={layoutOptions}
            value={isAutoGrid ? 'auto' : 'custom'}
            onChange={onLayoutChange}
            width="auto"
            minWidth={12}
            aria-labelledby={gridLabelId}
          />
        </Stack>
      </div>
    </Stack>
  );
}

function getStyles(theme: GrafanaTheme2) {
  const fieldBackground = theme.colors.background.primary;

  return {
    appsIconWrap: css({
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
    }),
    appsIcon: css({
      fill: theme.v1.palette.orange,
    }),
    prompt: css({
      width: '100%',
    }),
    orLine: css({
      flex: 1,
      height: 1,
      background: theme.colors.border.weak,
    }),
  };
}
