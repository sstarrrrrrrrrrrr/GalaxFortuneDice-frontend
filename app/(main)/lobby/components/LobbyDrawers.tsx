'use client'

import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfigProvider,
  Drawer,
  Input,
  Tag,
} from 'antd'
import {
  Gamepad2,
  Search,
  Swords,
  UserPlus,
  Users,
} from 'lucide-react'
import styles from './LobbyDrawers.module.css'
import { SignInModal } from './SignInModal'

interface LobbyDrawersProps {
  activeDrawer: 'tasks' | 'friends' | null
  onClose: () => void
}

interface FriendItem {
  id: string
  name: string
  level: number
  avatar: string
  online: boolean
  statusText: string
}

const friends: FriendItem[] = [
  {
    id: 'friend-1',
    name: '星轨旅人',
    level: 18,
    avatar: '/images/default_avatar.png',
    online: true,
    statusText: '大厅中',
  },
  {
    id: 'friend-2',
    name: '月面骰手',
    level: 12,
    avatar: '/images/default_avatar.png',
    online: true,
    statusText: '对局中',
  },
  {
    id: 'friend-3',
    name: '银河小队长',
    level: 23,
    avatar: '/images/default_avatar.png',
    online: false,
    statusText: '2 小时前在线',
  },
  {
    id: 'friend-4',
    name: '幸运引力',
    level: 9,
    avatar: '/images/default_avatar.png',
    online: false,
    statusText: '昨天在线',
  },
]

const drawerTheme = {
  token: {
    colorPrimary: '#6c7cff',
    colorInfo: '#6c7cff',
    colorText: '#f7f8ff',
    colorTextSecondary: 'rgba(231, 235, 255, 0.68)',
    colorBgContainer: 'rgba(13, 22, 83, 0.82)',
    colorBorderSecondary: 'rgba(150, 166, 255, 0.16)',
    borderRadius: 12,
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
}

export function LobbyDrawers({ activeDrawer, onClose }: LobbyDrawersProps) {
  return (
    <ConfigProvider theme={drawerTheme}>
      <SignInModal open={activeDrawer === 'tasks'} onClose={onClose} />
      <FriendDrawer open={activeDrawer === 'friends'} onClose={onClose} />
    </ConfigProvider>
  )
}

function FriendDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const onlineCount = friends.filter((friend) => friend.online).length

  return (
    <Drawer
      title={<DrawerTitle icon={<Users />} title="好友系统" subtitle="和伙伴一起掷出好运" />}
      placement="right"
      width="min(448px, 100vw)"
      open={open}
      onClose={onClose}
      rootClassName={styles.drawerRoot}
      className={styles.drawer}
      destroyOnHidden
    >
      <div className={styles.drawerContent}>
        <Card className={`${styles.glassCard} ${styles.addFriendCard}`}>
          <div className={styles.addFriendTitle}>
            <span className={styles.sectionIcon}>
              <UserPlus />
            </span>
            <div>
              <h3>添加好友</h3>
              <p>输入玩家昵称或 ID</p>
            </div>
          </div>
          <Input
            size="large"
            placeholder="搜索银河中的玩家"
            prefix={<Search size={17} />}
            suffix={
              <Button type="primary" size="small" className={styles.inputButton}>
                添加
              </Button>
            }
            className={styles.friendInput}
          />
        </Card>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionIcon}>
                <UserPlus />
              </span>
              <h3>好友申请</h3>
            </div>
            <Badge count={2} color="#765cff" />
          </div>
          <div className={styles.friendList}>
            <FriendRequest name="紫电流星" detail="Lv.16 · 想和你成为好友" />
            <FriendRequest name="骰子收藏家" detail="Lv.11 · 来自最近对局" />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionIcon}>
                <Gamepad2 />
              </span>
              <h3>我的好友</h3>
            </div>
            <span className={styles.sectionCaption}>
              {onlineCount}/{friends.length} 在线
            </span>
          </div>
          <div className={styles.friendList}>
            {friends.map((friend) => (
              <FriendCard key={friend.id} friend={friend} />
            ))}
          </div>
        </section>
      </div>
    </Drawer>
  )
}

function FriendRequest({ name, detail }: { name: string; detail: string }) {
  return (
    <Card className={styles.friendCard}>
      <div className={styles.friendProfile}>
        <Avatar size={46} src="/images/default_avatar.png" />
        <div>
          <h4>{name}</h4>
          <p>{detail}</p>
        </div>
      </div>
      <div className={styles.requestActions}>
        <Button type="primary" size="small" className={styles.acceptButton}>
          接受
        </Button>
        <Button size="small" className={styles.secondaryButton}>
          忽略
        </Button>
      </div>
    </Card>
  )
}

function FriendCard({ friend }: { friend: FriendItem }) {
  return (
    <Card className={`${styles.friendCard} ${!friend.online ? styles.offlineFriend : ''}`}>
      <div className={styles.friendProfile}>
        <Badge dot color={friend.online ? '#44e6a2' : '#7e86a8'} offset={[-3, 39]}>
          <Avatar size={48} src={friend.avatar} />
        </Badge>
        <div>
          <div className={styles.friendNameRow}>
            <h4>{friend.name}</h4>
            <Tag className={friend.online ? styles.onlineTag : styles.offlineTag}>
              {friend.online ? '在线' : '离线'}
            </Tag>
          </div>
          <p>
            Lv.{friend.level} · {friend.statusText}
          </p>
        </div>
      </div>
      <Button
        type={friend.online ? 'primary' : 'default'}
        disabled={!friend.online}
        className={friend.online ? styles.inviteButton : styles.disabledButton}
      >
        <Swords size={15} />
        邀请对战
      </Button>
    </Card>
  )
}

function DrawerTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className={styles.drawerTitle}>
      <span className={styles.drawerTitleIcon}>{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}
