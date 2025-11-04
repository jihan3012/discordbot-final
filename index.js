require('dotenv').config(); // Nếu dùng .env, nhưng code này hardcode

const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require('discord.js');

require('dotenv').config();

const token = process.env.TOKEN;
const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
const homelessRoleId = process.env.HOMELESS_ROLE_ID;
const whitelistChannelId = process.env.WHITELIST_CHANNEL_ID;
const targetChannelId = process.env.TARGET_CHANNEL_ID;
const adminRoleId = process.env.ADMIN_ROLE_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const MODAL_CUSTOM_ID = 'whitelist_form';
const REJECT_MODAL_CUSTOM_ID = 'reject_reason_modal';

// Bộ nhớ whitelist
const whitelist = new Set();

// Hàm tạo modal whitelist (giữ nguyên)
function createWhitelistModal() {
  const modal = new ModalBuilder()
    .setCustomId(MODAL_CUSTOM_ID)
    .setTitle('ĐĂNG KÝ - NHẬP CƯ');

  const fullNameInput = new TextInputBuilder()
    .setCustomId('full_name')
    .setLabel('Họ và tên:')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ghi đầy đủ thông tin và có dấu')
    .setRequired(true);

  const dobInput = new TextInputBuilder()
    .setCustomId('dob')
    .setLabel('Ngày/Tháng/Năm sinh:')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ví dụ: 1/1/2000')
    .setRequired(true);

  const genderInput = new TextInputBuilder()
    .setCustomId('gender')
    .setLabel('Giới tính:')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Nam/Nữ hoặc khác')
    .setRequired(true);

  const fbLinkInput = new TextInputBuilder()
    .setCustomId('facebook_link')
    .setLabel('Link facebook:')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ví dụ: https://www.facebook.com/xxxxx/')
    .setRequired(true);

  const rpUnderstandingInput = new TextInputBuilder()
    .setCustomId('rp_understanding')
    .setLabel('Bạn hiểu thế nào là Roleplay (RP):')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Câu hỏi quan trọng để được duyệt. Càng chi tiết càng tốt')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(fullNameInput),
    new ActionRowBuilder().addComponents(dobInput),
    new ActionRowBuilder().addComponents(genderInput),
    new ActionRowBuilder().addComponents(fbLinkInput),
    new ActionRowBuilder().addComponents(rpUnderstandingInput),
  );

  return modal;
}

// Hàm tạo modal từ chối (giữ nguyên)
function createRejectModal(targetUserId) {
  const modal = new ModalBuilder()
    .setCustomId(`${REJECT_MODAL_CUSTOM_ID}_${targetUserId}`)
    .setTitle('Lý do từ chối đơn whitelist');

  const reasonInput = new TextInputBuilder()
    .setCustomId('reject_reason')
    .setLabel('Lý do từ chối:')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Nhập lý do chi tiết để từ chối đơn này.')
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(reasonInput),
  );

  return modal;
}

// Hàm gửi embed đăng ký (giữ nguyên)
async function sendRegisterEmbed() {
  try {
    const channel = client.channels.cache.get(whitelistChannelId);
    if (!channel) {
      console.error(`Không tìm thấy kênh whitelist với ID: ${whitelistChannelId}`);
      return;
    }

    const messages = await channel.messages.fetch({ limit: 50 });
    const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title === 'ĐĂNG KÝ NHẬP CƯ');
    if (botMsg) {
      console.log('Thông báo đăng ký đã tồn tại.');
      return;
    }

    const embed = new EmbedBuilder()
      .setColor('Orange')
      .setTitle('ĐĂNG KÝ NHẬP CƯ')
      .setDescription(
`Đăng ký nhập cư bằng cách nhấn nút **"ĐĂNG KÝ"**

**Yêu cầu:**
- Trên 16 tuổi.
- Microphone hoạt động tốt và không dùng phần mềm thay đổi giọng nói.
- Nắm rõ luật và không toxic.

**Lưu ý:**
- Sau khi nộp đơn thành công vui lòng chờ tin nhắn riêng thông báo đạt hoặc không.
- Không tag Administrator và Moderator.`
      )
      .setImage('https://imgur.com/GGWq1CP.png')
      .setFooter({ text: 'RACCOON TOWN with loves' });

    const buttonRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('open_whitelist_modal')
          .setLabel('ĐĂNG KÝ')
          .setStyle(ButtonStyle.Success)
      );

    await channel.send({ embeds: [embed], components: [buttonRow] });
    console.log('Đã gửi thông báo ĐĂNG KÝ NHẬP CƯ.');
  } catch (error) {
    console.error('Lỗi khi gửi embed đăng ký:', error);
  }
}

client.once('ready', async () => {
  console.log(`Đã đăng nhập với tên: ${client.user.tag}`);

  const guild = client.guilds.cache.first();
  if (!guild) {
    console.log("Bot chưa có guild!");
    return;
  }

  try {
    await guild.commands.create({
      name: 'whitelist',
      description: 'Hiển thị danh sách người dùng đã đăng ký whitelist',
    });
    console.log('Slash commands đã đăng ký');
  } catch (error) {
    console.error('Lỗi khi đăng ký slash command:', error);
  }

  await sendRegisterEmbed();
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'whitelist') {
        const embed = new EmbedBuilder()
          .setTitle('Danh sách Whitelist')
          .setDescription(whitelist.size > 0 ? Array.from(whitelist).map(id => `<@${id}>`).join('\n') : 'Chưa có ai đăng ký.')
          .setColor(0x00FF00);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === 'open_whitelist_modal') {
        const modal = createWhitelistModal();
        await interaction.showModal(modal);
      } else if (interaction.customId.startsWith('approve_whitelist_')) {
        // Kiểm tra role admin
        if (!interaction.member.roles.cache.has(adminRoleId)) {
          await interaction.reply({ content: 'Bạn không có quyền duyệt đơn này. Chỉ admin mới có thể duyệt.', ephemeral: true });
          return;
        }

        const targetUserId = interaction.customId.split('_')[2];
        const targetUser = await client.users.fetch(targetUserId);
        const member = interaction.guild.members.cache.get(targetUserId);

        if (!member) {
          await interaction.reply({ content: 'Không tìm thấy thành viên này trong server.', ephemeral: true });
          return;
        }

        try {
          await member.roles.add(citizenRoleId);
          await member.roles.remove(homelessRoleId);
          console.log(`Đã duyệt cho ${targetUser.tag}`);

          await targetUser.send('Chúc mừng! Đơn đăng ký whitelist của bạn đã được duyệt. Bạn giờ là Cư Dân chính thức của RACCOON TOWN.');

          // Gửi embed kết quả vào kênh đích với nút xóa
          const approveEmbed = new EmbedBuilder()
            .setTitle('Đơn Whitelist Đã Được Duyệt')
            .setColor('Green')
            .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
            .setDescription(`Đơn của <@${targetUserId}> đã được duyệt bởi <@${interaction.user.id}>.`)
            .setTimestamp();

          const deleteButton = new ButtonBuilder()
            .setCustomId(`delete_embed_${targetUserId}`)
            .setLabel('Xóa')
            .setStyle(ButtonStyle.Danger);

          const buttonRow = new ActionRowBuilder().addComponents(deleteButton);

          const targetChannel = client.channels.cache.get(targetchannelId);
          if (targetChannel) {
            await targetChannel.send({ embeds: [approveEmbed], components: [buttonRow] });
            console.log('Đã gửi thông báo duyệt vào kênh trả đơn whitelist.');
          } else {
            console.error('Không thể gửi vào kênh trả đơn whitelist.');
          }

          await interaction.reply({ content: `Đã duyệt cho ${targetUser.tag}.`, ephemeral: true });
        } catch (error) {
          console.error('Lỗi khi duyệt:', error);
          await interaction.reply({ content: 'Có lỗi xảy ra khi duyệt.', ephemeral: true });
        }
      } else if (interaction.customId.startsWith('reject_whitelist_modal_')) {
        // Kiểm tra role admin
        if (!interaction.member.roles.cache.has(adminRoleId)) {
          await interaction.reply({ content: 'Bạn không có quyền từ chối đơn này. Chỉ admin mới có thể từ chối.', ephemeral: true });
          return;
        }

        const targetUserId = interaction.customId.split('_')[3];
        const modal = createRejectModal(targetUserId);
        await interaction.showModal(modal);
      } else if (interaction.customId.startsWith('delete_embed_')) {
        // Xử lý nút xóa (chỉ admin)
        if (!interaction.member.roles.cache.has(adminRoleId)) {
          await interaction.reply({ content: 'Bạn không có quyền xóa embed này.', ephemeral: true });
          return;
        }

        try {
          await interaction.message.delete();
          await interaction.reply({ content: 'Đã xóa embed.', ephemeral: true });
        } catch (error) {
          console.error('Lỗi khi xóa embed:', error);
          await interaction.reply({ content: 'Không thể xóa embed.', ephemeral: true });
        }
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === MODAL_CUSTOM_ID) {
        const userId = interaction.user.id;
        
        if (whitelist.has(userId)) {
          await interaction.reply({ content: 'Bạn đã đăng ký whitelist rồi!', ephemeral: true });
          return;
        }
        whitelist.add(userId);

        const fullName = interaction.fields.getTextInputValue('full_name');
        const dob = interaction.fields.getTextInputValue('dob');
        const gender = interaction.fields.getTextInputValue('gender');
        const facebookLink = interaction.fields.getTextInputValue('facebook_link');
        const rpUnderstanding = interaction.fields.getTextInputValue('rp_understanding');

        const whitelistEmbed = new EmbedBuilder()
          .setTitle('Đơn đăng ký whitelist mới')
          .setColor('Blue')
          .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .addFields(
            { name: 'Họ và tên', value: fullName },
            { name: 'Ngày/Tháng/Năm sinh', value: dob },
            { name: 'Giới tính', value: gender },
            { name: 'Link Facebook', value: facebookLink },
            { name: 'Thế nào là Roleplay? (RP)', value: rpUnderstanding },
          )
          .setTimestamp();

        const buttonRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`approve_whitelist_${userId}`)
              .setLabel('Duyệt')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`reject_whitelist_modal_${userId}`)
              .setLabel('Không duyệt')
              .setStyle(ButtonStyle.Danger)
          );

        // Gửi embed đơn mới vào kênh đích
        const targetChannel = client.channels.cache.get(targetchannelId);
        if (targetChannel) {
          await targetChannel.send({ embeds: [whitelistEmbed], components: [buttonRow] });
          console.log('Đã gửi embed đơn mới vào kênh trả đơn whitelist');
        } else {
          console.error('Không thể gửi embed vào kênh trả đơn whitelist.');
        }

        await interaction.reply({ content: 'Cảm ơn bạn đã gửi đơn đăng ký whitelist! Chúng tôi sẽ xem xét và phản hồi sớm.', ephemeral: true });
      } else if (interaction.customId.startsWith(`${REJECT_MODAL_CUSTOM_ID}_`)) {
        const targetUserId = interaction.customId.split('_')[3];
        const targetUser = await client.users.fetch(targetUserId);

        const reason = interaction.fields.getTextInputValue('reject_reason');

        try {
          await targetUser.send(`Rất tiếc, đơn đăng ký whitelist của bạn không được duyệt. Lý do: ${reason}. Vui lòng thử lại hoặc liên hệ admin để biết thêm chi tiết.`);

          // Gửi embed kết quả vào kênh đích với nút xóa
          const rejectEmbed = new EmbedBuilder()
            .setTitle('Đơn Whitelist Đã Bị Từ Chối')
            .setColor('Red')
            .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
            .setDescription(`Đơn của <@${targetUserId}> đã bị từ chối bởi <@${interaction.user.id}>.`)
            .addFields({ name: 'Lý do từ chối', value: reason })
            .setTimestamp();

          const deleteButton = new ButtonBuilder()
            .setCustomId(`delete_embed_${targetUserId}`)
            .setLabel('Xóa')
            .setStyle(ButtonStyle.Danger);

          const buttonRow = new ActionRowBuilder().addComponents(deleteButton);

          const targetChannel = client.channels.cache.get(targetchannelId);
          if (targetChannel) {
            await targetChannel.send({ embeds: [rejectEmbed], components: [buttonRow] });
            console.log('Đã gửi thông báo từ chối vào kênh trả đơn whitelist.');
          } else {
            console.error('Không thể gửi vào kênh trả đơn whitelist.');
          }

          await interaction.reply({ content: `Đã từ chối đơn của ${targetUser.tag} với lý do: ${reason}.`, ephemeral: true });
        } catch (error) {
          console.error('Lỗi khi từ chối:', error);
          await interaction.reply({ content: 'Có lỗi xảy ra khi từ chối.', ephemeral: true });
        }
      }
    }
  } catch (error) {
    console.error('Lỗi trong interaction:', error);
  }
});

// Event welcome (giữ nguyên)
client.on('guildMemberAdd', async member => {
  console.log(`Thành viên mới: ${member.user.tag}`);

  try {
    await member.roles.add(homelessRoleId);
    console.log(`Đã gán role "Vô Gia Cư" cho ${member.user.tag}`);
  } catch (error) {
    console.error('Lỗi khi gán role:', error);
  }

  const channel = member.guild.channels.cache.get(welcomeChannelId);
  if (!channel) {
    console.log('Không tìm thấy kênh chào mừng');
    return;
  }

  const welcomeEmbed = new EmbedBuilder()
    .setColor('Orange')
    .setAuthor({
      name: 'RACCOON TOWN',
      iconURL: member.user.displayAvatarURL()
    })
    .setDescription(`
✨ Chào mừng cư dân mới đã đến với
**[VN] RACCOON TOWN** ✨

🌻 Chào bạn <@${member.id}>, bạn là du khách thứ ${member.guild.memberCount} nhập cư vào [VN] RACCOON TOWN
🔒 Hãy vào nộp đơn tại <#${whitelistChannelId}> để trở thành Cư Dân chính thức
📌 Đừng quên dành vài phút đọc <#1434524006425563188>`,
    )
    .setImage('https://imgur.com/GGWq1CP.png')
    .setFooter({ text: 'RACCOON TOWN' });

  await channel.send({ embeds: [welcomeEmbed] });
});

client.login(token);
