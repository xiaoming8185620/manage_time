import copy
from pathlib import Path
from test_workshop import WorkshopTests
from server.domain import Problem
from server.workshop_growth import restore_growth

class WorkshopGrowthTests(WorkshopTests):
    def test_supply_growth_preserves_legacy_costs_and_all_four_upgrade_groups(self):
        self.fund()
        for i in range(2):
            identifier=f'supply-fund-{i}'
            self.act(dict(type='ADD_TASK',task=dict(id=identifier,title='临时补给验收',estimate=10)),now=9400000)
            self.act(dict(type='START_TASK',id=identifier),now=9400000)
            self.act(dict(type='RECORD_TASK',id=identifier,status='done',actualMinutes=10))
            self.act(dict(type='CLAIM_REWARD',id=identifier))
        self.act(dict(type='CARE_SCENE',targetId='ws-train',verb='care',expectedCount=0,careId='old-train-receipt'))
        for kind,option in [('dock','scan'),('arm','precision'),('pod','escort'),('lift','lift')]:
            for level in range(3):
                action=dict(type='UPGRADE_WORKSHOP',targetId=f'supply-{kind}',expectedLevel=level,cost=0)
                self.act(action);self.act(action)
            self.act(dict(type='INTERACT_WORKSHOP',targetId=f'supply-{kind}',option=option))
        state=self.store.state('c')['state']
        self.assertEqual(state['coins'],2)
        self.assertEqual(len(state['workshopGrowth']),4)
        other=self.make_store(Path(self.temp.name)/'supply-import')
        try:
            restored=other.import_save('c',state,12000000)['state']
            self.assertEqual(restored['coins'],2)
            self.assertEqual(restored['care'],state['care'])
            self.assertEqual(restored['workshopGrowth'],state['workshopGrowth'])
        finally:other.close()

    def test_upgrade_retry_import_reopen_and_options(self):
        self.fund()
        for level,cost in enumerate((3,5,8)):
            before=self.store.state('c')['state']['coins']
            action=dict(type='UPGRADE_WORKSHOP',targetId='bench',expectedLevel=level,cost=0)
            self.act(action);self.act(action)
            self.assertEqual(self.store.state('c')['state']['coins'],before-cost)
        for option in ('flower','satellite','star','flower'):
            self.act(dict(type='INTERACT_WORKSHOP',targetId='bench',option=option))
        state=self.store.state('c')['state']
        self.assertEqual(state['workshopGrowth']['bench']['crafted'],['flower','satellite','star'])
        self.assertEqual(state['coins'],34)
        self.assertEqual(len(self.store.all("SELECT * FROM events WHERE kind='UPGRADE_WORKSHOP'")),3)
        other=self.make_store(Path(self.temp.name)/'growth-import')
        try:
            imported=other.import_save('c',state,12000000)['state']
            self.assertEqual(imported['coins'],34)
            self.assertEqual(imported['workshopGrowth'],state['workshopGrowth'])
        finally:other.close()
        self.store.close();self.store=self.make_reopened()
        self.assertEqual(self.store.state('c')['state']['workshopGrowth'],state['workshopGrowth'])
    def make_reopened(self):
        from server.store import Store
        return Store(self.path)
    def test_credit_validation_and_atomic_failures(self):
        self.fund();self.act(dict(type='BUILD_HABITAT',habitatId='robot-dock'))
        for level in range(3):self.act(dict(type='UPGRADE_WORKSHOP',targetId='dog',expectedLevel=level))
        state=self.store.state('c')['state'];self.assertEqual(state['coins'],34)
        self.assertEqual(state['workshopGrowth']['dog']['spent'],6)
        self.assertEqual(restore_growth(state['workshopGrowth'],state['habitats'],12000000),state['workshopGrowth'])
        bad=copy.deepcopy(state['workshopGrowth']);bad['dog']['spent']=0
        with self.assertRaises(ValueError):restore_growth(bad,state['habitats'],12000000)
        before=self.store.state('c')
        for action in [dict(type='INTERACT_WORKSHOP',targetId='earth',option='solar'),dict(type='UPGRADE_WORKSHOP',targetId='train',expectedLevel=0),dict(type='CARE_SCENE',targetId='ws-dog',verb='care',careId='old-client-care',expectedCount=0)]:
            with self.assertRaises(Problem):self.act(action)
            self.assertEqual(self.store.state('c'),before)
